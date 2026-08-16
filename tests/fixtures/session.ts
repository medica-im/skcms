import { readFileSync } from 'node:fs';
import { createCipheriv, createHmac, hkdf, randomBytes } from 'node:crypto';
import { promisify } from 'node:util';

const hkdfAsync = promisify(hkdf);

// Built on node:crypto rather than `jose` on purpose: adding jose as a
// top-level dependency re-resolves the copy that @ts-ghost/core-api requires
// from CJS, which breaks `vite build` with ERR_INTERNAL_ASSERTION on Node 22.

const b64url = (b: Buffer) => b.toString('base64url');

/**
 * Mints a real Auth.js v5 session cookie (JWE) so Playwright can browse as a
 * given role without going through Google/GitHub OAuth.
 *
 * The backend decrypts this cookie with the same AUTH_SECRET and resolves the
 * role from Neo4j via the `providerAccountId` (the OAuth `sub`), so the seeded
 * users in seed_test_users.py determine which role each session gets.
 */

export type TestRole = 'superuser' | 'administrator' | 'staff' | 'registered';

/** Must match the subs seeded by tests/fixtures/seed_test_users.py. */
export const TEST_ACCOUNTS: Record<TestRole, { sub: string; email: string; name: string }> = {
	superuser: { sub: 'e2e-sub-superuser', email: 'e2e-superuser@example.test', name: 'E2E Superuser' },
	administrator: {
		sub: 'e2e-sub-administrator',
		email: 'e2e-administrator@example.test',
		name: 'E2E Administrator'
	},
	staff: { sub: 'e2e-sub-staff', email: 'e2e-staff@example.test', name: 'E2E Staff' },
	registered: {
		sub: 'e2e-sub-registered',
		email: 'e2e-registered@example.test',
		name: 'E2E Registered'
	}
};

/**
 * Auth.js — and fastapi_nextauth_jwt on the backend, which derives its
 * decryption key from this same name as the HKDF salt — switches to the
 * "__Secure-" prefixed cookie whenever the site is served over https://. A
 * cookie minted under the wrong name is encrypted with the wrong salt, so it
 * fails to decrypt no matter how correct its claims are. See PUBLIC_ORIGIN
 * in .env for which scheme the site under test actually uses.
 */
export function sessionCookieName(origin: string): string {
	return origin.startsWith('https://') ? '__Secure-authjs.session-token' : 'authjs.session-token';
}

/**
 * Reads a variable from the process environment, falling back to the .env the
 * dev server itself was started with.
 *
 * Nothing loads .env into the Playwright process — no dotenv dependency, and
 * `pnpm dev` reads it through Vite, which the test runner never goes through.
 * A bare `process.env.X ?? 'some default'` in a step file therefore always
 * takes the default, silently testing a different site than the one
 * scripts/dev.sh selected.
 */
function readEnv(name: string): string | undefined {
	if (process.env[name]) return process.env[name];
	const env = readFileSync(new URL('../../.env', import.meta.url), 'utf8');
	const match = env.match(new RegExp(`^${name}\\s*=\\s*"?([^"\\n#]+)"?`, 'm'));
	return match?.[1].trim();
}

function readAuthSecret(): string {
	const secret = readEnv('AUTH_SECRET');
	if (!secret) throw new Error('AUTH_SECRET not found in environment or .env');
	return secret;
}

/**
 * Hostname pattern for the per-worker sites. `{i}` is the worker index.
 *
 * Must agree with three other places or the suite silently tests the wrong
 * thing: the nginx vhost (scripts/nginx/e2e-workers.conf, a `w\d+` regex),
 * vite's allowedHosts (`.dev.medica.im` in vite.config.ts) and the seeder
 * (WORKER_DOMAIN_TEMPLATE in tests/fixtures/seed_worker_sites.py).
 */
const WORKER_DOMAIN = process.env.E2E_WORKER_DOMAIN ?? 'w{i}.dev.medica.im';

/**
 * The site under test, scheme included — the single place every step file
 * should get it from, so they cannot disagree about which site (or which
 * scheme, which decides the cookie name above) they are exercising.
 *
 * **Each worker gets its own site, not the one in .env.** The backend resolves
 * which Site a request belongs to from the request hostname, so one hostname
 * meant one shared dataset and four workers fighting over it: a scenario
 * restricting an avatar and a sibling resetting it collided, and
 * clearApiCache() — a global Redis flush — dropped one worker's payload between
 * another's write and its read. Those failures looked like races but were plain
 * interference, and no amount of per-scenario cloning removes a shared
 * resource. A hostname per worker gives each its own Site, Directory,
 * Organization and entries, so there is nothing left to contend over.
 *
 * It also decouples the suite from `scripts/dev.sh`: which site you happen to
 * be developing no longer decides what the tests exercise, and a run cannot
 * mutate the dataset you are looking at in the browser.
 *
 * TEST_PARALLEL_INDEX is set by Playwright in each worker process and is stable
 * for its lifetime. It is absent in the main process — where playwright.config
 * is evaluated — so callers that need the origin before workers exist (the
 * `webServer` readiness check) must not rely on this.
 *
 * https, always: Auth.js derives the session-cookie name *and* its encryption
 * salt from whether the request looks secure, and the backend's
 * fastapi_nextauth_jwt derives the same salt independently. Serve these over
 * plain http and every authenticated scenario 401s.
 */
export function apiOrigin(workerIndex?: number): string {
	const index = workerIndex ?? Number(process.env.TEST_PARALLEL_INDEX ?? 0);
	return `https://${WORKER_DOMAIN.replace('{i}', String(index))}`;
}

/** Auth.js v5 key derivation (see fastapi_nextauth_jwt: HKDF-SHA256, salt = cookie name). */
async function derivedKey(secret: string, salt: string): Promise<Buffer> {
	const key = await hkdfAsync(
		'sha256',
		secret,
		salt,
		`Auth.js Generated Encryption Key (${salt})`,
		64 // A256CBC-HS512
	);
	return Buffer.from(key as ArrayBuffer);
}

/** An identity the graph has never heard of, for the signed-in-but-unknown case. */
export type TestIdentity = { sub: string; email: string; name: string };

export async function createSessionCookie(
	role: TestRole | TestIdentity,
	origin = apiOrigin()
): Promise<string> {
	// A scenario about somebody the service does not recognise cannot use one of
	// the seeded accounts — they are all known by construction — so an identity
	// may be passed in whole rather than looked up by role.
	const account = typeof role === 'string' ? TEST_ACCOUNTS[role] : role;
	const key = await derivedKey(readAuthSecret(), sessionCookieName(origin));
	const now = Math.floor(Date.now() / 1000);

	const payload = JSON.stringify({
		name: account.name,
		email: account.email,
		sub: account.sub,
		// The backend reads the role's identity from this claim.
		providerAccountId: account.sub,
		iat: now,
		exp: now + 60 * 60
	});

	// JWE compact serialization, alg=dir + enc=A256CBC-HS512 (RFC 7516 §5.1 /
	// RFC 7518 §5.2.5): first 32 bytes of the key are the HMAC key, last 32 the
	// AES key; the tag is the first half of HMAC-SHA512 over AAD|IV|CT|AL.
	const macKey = key.subarray(0, 32);
	const encKey = key.subarray(32, 64);

	const header = b64url(Buffer.from(JSON.stringify({ alg: 'dir', enc: 'A256CBC-HS512' })));
	const iv = randomBytes(16);
	const cipher = createCipheriv('aes-256-cbc', encKey, iv);
	const ciphertext = Buffer.concat([cipher.update(Buffer.from(payload, 'utf8')), cipher.final()]);

	const aad = Buffer.from(header, 'ascii');
	// AL = AAD bit length as a 64-bit big-endian integer.
	const al = Buffer.alloc(8);
	al.writeBigUInt64BE(BigInt(aad.length) * 8n);
	const tag = createHmac('sha512', macKey)
		.update(Buffer.concat([aad, iv, ciphertext, al]))
		.digest()
		.subarray(0, 32);

	// alg=dir means the encrypted key segment is empty.
	return [header, '', b64url(iv), b64url(ciphertext), b64url(tag)].join('.');
}

/** Playwright storageState for a role, usable via browser.newContext(). */
export async function storageStateForRole(role: TestRole, origin: string) {
	const token = await createSessionCookie(role, origin);
	const { hostname, protocol } = new URL(origin);
	return {
		cookies: [
			{
				name: sessionCookieName(origin),
				value: token,
				domain: hostname,
				path: '/',
				expires: Math.floor(Date.now() / 1000) + 3600,
				httpOnly: true,
				secure: protocol === 'https:',
				sameSite: 'Lax' as const
			}
		],
		origins: []
	};
}

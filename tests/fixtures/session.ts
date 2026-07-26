import { readFileSync } from 'node:fs';
import { hkdf } from 'node:crypto';
import { promisify } from 'node:util';
import { EncryptJWT } from 'jose';

const hkdfAsync = promisify(hkdf);

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

/** Non-secure cookie name: the dev server runs over plain http. */
export const SESSION_COOKIE = 'authjs.session-token';

function readAuthSecret(): string {
	if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
	// Fall back to the .env the dev server itself was started with.
	const env = readFileSync(new URL('../../.env', import.meta.url), 'utf8');
	const match = env.match(/^AUTH_SECRET\s*=\s*"?([^"\n#]+)"?/m);
	if (!match) throw new Error('AUTH_SECRET not found in environment or .env');
	return match[1].trim();
}

/** Auth.js v5 key derivation (see fastapi_nextauth_jwt: HKDF-SHA256, salt = cookie name). */
async function derivedKey(secret: string, salt: string): Promise<Uint8Array> {
	const key = await hkdfAsync(
		'sha256',
		secret,
		salt,
		`Auth.js Generated Encryption Key (${salt})`,
		64 // A256CBC-HS512
	);
	return new Uint8Array(key as ArrayBuffer);
}

export async function createSessionCookie(role: TestRole): Promise<string> {
	const account = TEST_ACCOUNTS[role];
	const secret = readAuthSecret();
	const key = await derivedKey(secret, SESSION_COOKIE);
	const now = Math.floor(Date.now() / 1000);

	return await new EncryptJWT({
		name: account.name,
		email: account.email,
		sub: account.sub,
		// The backend reads the role's identity from this claim.
		providerAccountId: account.sub
	})
		.setProtectedHeader({ alg: 'dir', enc: 'A256CBC-HS512' })
		.setIssuedAt(now)
		.setExpirationTime(now + 60 * 60)
		.encrypt(key);
}

/** Playwright storageState for a role, usable via browser.newContext(). */
export async function storageStateForRole(role: TestRole, origin: string) {
	const token = await createSessionCookie(role);
	const { hostname } = new URL(origin);
	return {
		cookies: [
			{
				name: SESSION_COOKIE,
				value: token,
				domain: hostname,
				path: '/',
				expires: Math.floor(Date.now() / 1000) + 3600,
				httpOnly: true,
				secure: false,
				sameSite: 'Lax' as const
			}
		],
		origins: []
	};
}

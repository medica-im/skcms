import { execFile } from 'node:child_process';
import { createBdd } from 'playwright-bdd';
import { createSessionCookie, SESSION_COOKIE, type TestRole } from '../tests/fixtures/session';

const { Given } = createBdd();

const BACKEND_DIR = new URL('../../backend', import.meta.url).pathname;
const COMPOSE_FILE = 'docker-compose-development.yml';

/**
 * Run Python in the backend's Django shell. Some state (avatar_access) has no
 * API for the values the tests need, so it is set directly in the database.
 */
export function djangoShell(code: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const child = execFile(
			'docker',
			['compose', '-f', COMPOSE_FILE, 'exec', '-T', 'django', 'python', 'manage.py', 'shell'],
			{ cwd: BACKEND_DIR, timeout: 60_000 },
			(error, stdout, stderr) => {
				if (error) return reject(new Error(`django shell failed: ${stderr || error.message}`));
				resolve(stdout);
			}
		);
		child.stdin?.end(code);
	});
}

/**
 * Adds a real Auth.js session cookie for one of the seeded per-role test users
 * (see tests/fixtures/seed_test_users.py), avoiding the OAuth flow.
 *
 * Shared by every feature: playwright-bdd rejects duplicate step definitions,
 * so steps used by more than one feature file live here.
 */
export async function addSessionCookie(
	context: import('@playwright/test').BrowserContext,
	role: TestRole,
	baseURL: string | undefined
) {
	await context.addCookies([
		{
			name: SESSION_COOKIE,
			value: await createSessionCookie(role),
			domain: new URL(baseURL ?? 'http://localhost:3000').hostname,
			path: '/',
			expires: Math.floor(Date.now() / 1000) + 3600,
			httpOnly: true,
			secure: false,
			sameSite: 'Lax'
		}
	]);
}

Given('I am signed in with the role {string}', async ({ context, baseURL }, role: string) => {
	await addSessionCookie(context, role as TestRole, baseURL);
});

Given('I am signed out', async ({ context }) => {
	await context.clearCookies();
});

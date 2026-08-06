import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';
import {
	apiOrigin,
	createSessionCookie,
	sessionCookieName,
	type TestRole
} from '../tests/fixtures/session';

const { Given } = createBdd(test);

/**
 * Run Python in the backend's Django shell. Some state (avatar_access) has no
 * API for the values the tests need, so it is set directly in the database.
 *
 * Re-exported from seed.ts rather than reimplemented: that version drops the
 * cached API payloads afterwards, which a direct database write must always do
 * (see the note on djangoShell there). A second copy here silently skipped it.
 */
export { djangoShell } from './seed';

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
	// The browser reaches the site through nginx at PUBLIC_ORIGIN (see the
	// baseURL note in playwright.config.ts), so the same origin decides both
	// where the cookie is sent and how it is named and encrypted.
	const origin = baseURL ?? apiOrigin();
	await context.addCookies([
		{
			name: sessionCookieName(origin),
			value: await createSessionCookie(role, origin),
			domain: new URL(origin).hostname,
			path: '/',
			expires: Math.floor(Date.now() / 1000) + 3600,
			httpOnly: true,
			secure: new URL(origin).protocol === 'https:',
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

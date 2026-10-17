import { test, expect } from '@playwright/test';

/**
 * Google is the only way to sign in.
 *
 * A provider registered on the server is reachable at /auth/signin/<id> even
 * when no button shows it, so the list Auth.js serves is what is checked, not
 * the sign-in page.
 */
test('the site offers Google sign-in and nothing else', async ({ request }) => {
	const response = await request.get('/auth/providers');
	expect(response.ok()).toBe(true);
	expect(Object.keys(await response.json())).toEqual(['google']);
});

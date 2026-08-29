import { test, expect, request } from '@playwright/test';
import { createSessionCookie, sessionCookieName } from '../fixtures/session';
import { originFor, requireSite } from './sites';

/**
 * The clone tool, end to end over HTTP.
 *
 * The unit and integration tests prove the pieces: the token's properties, what
 * collides with what, and what a clone writes into the graph. This proves the
 * assembled thing answers on the wire — that the router is registered, the gate
 * refuses the wrong role, and a superuser reaches the registry.
 *
 * A real Auth.js session cookie rather than a mocked dependency, because the
 * thing most likely to be wrong in an assembled system is the seam: a route
 * that exists but is not registered, or a gate that never sees the identity.
 */

const SITE = 'santelyon3.fr';
const ORIGIN = originFor(SITE);

// About one tenant in particular: fail naming the server to start, rather than
// measuring whatever else answers on this hostname.
test.beforeAll(async () => await requireSite(SITE));

async function ctx(role: 'superuser' | 'administrator' | 'staff' | null) {
	const c = await request.newContext({ baseURL: ORIGIN });
	if (!role) return c;
	const cookie = await createSessionCookie(role, ORIGIN);
	await c.dispose();
	return await request.newContext({
		baseURL: ORIGIN,
		extraHTTPHeaders: { Cookie: `${sessionCookieName(ORIGIN)}=${cookie}` }
	});
}

test.describe('the clone endpoints are wired up', () => {
	test('a superuser reaches the peer registry', async () => {
		const c = await ctx('superuser');
		const r = await c.get('/api/v2/clone/instances');
        expect(r.status(), 'a superuser should reach the registry').toBe(200);
		expect(Array.isArray(await r.json())).toBe(true);
		await c.dispose();
	});

	for (const role of ['administrator', 'staff'] as const) {
		test(`an ${role} is refused`, async () => {
			// Deliberately narrower than /admin/entries: an administrator runs
			// their own directory, and reaching into another deployment's data
			// is a different power.
			const c = await ctx(role);
			const r = await c.get('/api/v2/clone/instances');
			expect(r.status()).toBe(403);
			await c.dispose();
		});
	}

	test('an anonymous visitor is refused', async () => {
		const c = await ctx(null);
		const r = await c.get('/api/v2/clone/instances');
		expect([401, 403]).toContain(r.status());
		await c.dispose();
	});

	test('a token may not be minted for an unknown target', async () => {
		// The peer registry is what stops an arbitrary origin in a request body
		// from being handed a credential for this directory.
		const c = await ctx('superuser');
		const r = await c.post('/api/v2/clone/export-token', {
			data: { target_origin: 'https://not-a-peer.example', entry_uids: null }
		});
		expect(r.status(), 'an unregistered origin was issued a token').toBe(403);
		await c.dispose();
	});

	test('preflight refuses an unknown peer rather than guessing', async () => {
		const c = await ctx('superuser');
		const r = await c.post('/api/v2/clone/preflight', {
			data: { instance: 'no-such-peer', token: 'x', entry_uids: [] }
		});
		expect(r.status()).toBe(404);
		await c.dispose();
	});
});

test.describe('the wizard is reachable', () => {
	test('the clone page renders for a superuser', async ({ browser }) => {
		const cookie = await createSessionCookie('superuser', ORIGIN);
		const context = await browser.newContext();
		await context.addCookies([
			{
				name: sessionCookieName(ORIGIN),
				value: cookie,
				url: ORIGIN
			}
		]);
		const page = await context.newPage();
		const errors: string[] = [];
		page.on('pageerror', (e) => errors.push(String(e)));
		await page.goto(`${ORIGIN}/web/clone`, { waitUntil: 'networkidle' });
		await page.waitForTimeout(2500);

		await expect(page.getByRole('heading', { name: /Cloner une fiche/i })).toBeVisible();
		expect(errors, 'the clone page threw').toEqual([]);
		await context.close();
	});
});

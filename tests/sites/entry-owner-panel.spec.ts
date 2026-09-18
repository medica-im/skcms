import { test, expect, request } from '@playwright/test';
import { createSessionCookie, sessionCookieName } from '../fixtures/session';
import { originFor, requireSite } from './sites';

/**
 * The owner / creator panel names its people on the first paint.
 *
 * Reported against a real entry: an admin opened
 * /annuaire/e/aurelie-ferriz-apa-01, whose owner is a real user, and the panel
 * said "Aucun utilisateur associé." — on arrival and again after a reload,
 * while the modal that edits owners listed that same person correctly.
 *
 * This is the level the bug lives at, and the reason the component tests beside
 * CreatorOwner.svelte could not catch it. Those render the component with props
 * already in hand; they passed against both the broken and the fixed
 * implementation, which is exactly what makes them the wrong instrument here.
 * What decides this is the whole path — a session with a role that may see the
 * panel, a page load that resolves `fullentry.owner`, and a `getUser` query
 * answered over HTTP with that session's cookie.
 *
 * Deterministic in both halves. The viewer is the seeded superuser rather than
 * whoever is logged in, and the owner is a seeded user on a seeded entry rather
 * than a row of live data somebody may reassign — the reported entry would make
 * this pass or fail depending on who owns it today.
 *
 * Asserted on the first response's HTML rather than after hydration: "on first
 * page load" is the claim, and a panel that fills in only once the client has
 * run is still the reported bug for anyone reading what arrived.
 */

const SITE = 'unipa.fr';
const ORIGIN = originFor(SITE);
const BASE = '/annuaire';

test.beforeAll(async () => await requireSite(SITE));

/**
 * The entry tests/fixtures/seed_owned_entry.py points at the seeded superuser.
 *
 * Named here rather than discovered, so a run that has not been seeded fails
 * saying which fixture to run instead of quietly measuring a different entry.
 */
const ENTRY = 'adeline-feldis-ipa-01';

/**
 * A browser context signed in as one of the seeded accounts.
 *
 * The panel renders only for superuser and administrator
 * (EffectorContact.svelte), so the role is part of what is under test rather
 * than incidental setup.
 */
async function signedIn(role: 'superuser' | 'administrator' | 'staff') {
	const cookie = await createSessionCookie(role, ORIGIN);
	return await request.newContext({
		baseURL: ORIGIN,
		extraHTTPHeaders: { Cookie: `${sessionCookieName(ORIGIN)}=${cookie}` }
	});
}

/** The empty state. Seeing this while an owner exists is the bug. */
const EMPTY = 'Aucun utilisateur associé';

test.describe('the owner / creator panel on an entry page', () => {
	test('names the owner in the first response, for an admin', async () => {
		// `administrator`, not `superuser`: seed_test_users.py provisions roles
		// against one site at a time, and on this one only the administrator
		// holds one. A superuser session is then refused by
		// authorize_api("users_v2") — 403 on the very request the panel makes —
		// which is a fact about the seeding rather than about the panel.
		const ctx = await signedIn('administrator');

		// The entry really does have an owner: asserted against the API rather
		// than assumed, so a fixture that failed to seed fails here saying so
		// instead of making the page assertion look like a rendering bug.
		const api = await ctx.get(`/api/v2/fullentries/slug/${ENTRY}`);
		expect(api.status(), `GET fullentries/slug/${ENTRY}`).toBe(200);
		const entry = await api.json();
		expect(
			entry.owner?.length ?? 0,
			`${ENTRY} has no owner, so this spec has nothing to prove. ` +
				`Seed it: SEED_SITE_DOMAIN=dev.unipa.fr ... seed_owned_entry.py`
		).toBeGreaterThan(0);

		const page = await ctx.get(`${BASE}/e/${ENTRY}`);
		expect(page.status()).toBe(200);
		const html = await page.text();

		// The owner's email, because that is what the row renders for certain —
		// the name field can be null on a user the panel still has to show.
		const ownerEmail = await ownerEmailOf(ctx, entry.owner[0]);
		expect(
			html,
			`the panel showed "${EMPTY}" for an entry owned by ${ownerEmail}`
		).toContain(ownerEmail);

		await ctx.dispose();
	});

	test('does not claim the entry has nobody associated', async () => {
		// The reported symptom in its own words. Separate from the assertion
		// above so a run says which half is wrong: a page missing the email is a
		// resolution failure, a page carrying the empty line is the panel having
		// decided there is nothing to show.
		const ctx = await signedIn('superuser');
		const html = await (await ctx.get(`${BASE}/e/${ENTRY}`)).text();
		expect(html).not.toContain(EMPTY);
		await ctx.dispose();
	});

	test('says the same thing on a reload', async () => {
		// "not even after a reload" was part of the report, and a second request
		// exercises what the first one cached — a query whose result was copied
		// into component state answered the first load and not the second.
		const ctx = await signedIn('superuser');
		await ctx.get(`${BASE}/e/${ENTRY}`);
		const html = await (await ctx.get(`${BASE}/e/${ENTRY}`)).text();
		expect(html).not.toContain(EMPTY);
		await ctx.dispose();
	});

	test('shows the panel to an administrator too', async () => {
		// Both roles the panel is gated on, since a gate that admits only one of
		// them is a bug this spec should not pass over.
		const ctx = await signedIn('administrator');
		const html = await (await ctx.get(`${BASE}/e/${ENTRY}`)).text();
		expect(html).not.toContain(EMPTY);
		await ctx.dispose();
	});

	test('does not show the panel to staff', async () => {
		// The other half of the gate: ownership is administrative information,
		// and a spec that only proves the panel appears would not notice it
		// appearing for everybody.
		const ctx = await signedIn('staff');
		const html = await (await ctx.get(`${BASE}/e/${ENTRY}`)).text();
		expect(html).not.toContain('Propriétaire / Créateur');
		await ctx.dispose();
	});
});

/** The email the API reports for a user uid, as the panel would resolve it. */
async function ownerEmailOf(
	ctx: Awaited<ReturnType<typeof request.newContext>>,
	uid: string
): Promise<string> {
	const r = await ctx.get(`/api/v2/users/${uid}`);
	expect(r.status(), `GET users/${uid} — the panel makes this same request`).toBe(200);
	const user = await r.json();
	expect(user.email, `user ${uid} has no email for the panel to show`).toBeTruthy();
	return user.email;
}

import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';
import { apiOrigin, sessionCookieName, type TestRole } from '../tests/fixtures/session';
import { addSessionCookie } from './common.steps';
import { seedAvatar, cloneEntry, removeClonedEntry, djangoShell, SEED_TAG } from './seed';

const { Given, When, Then, After } = createBdd(test);

/** The throwaway entry this scenario created, so teardown can delete it. */
let clonedUid: string | null = null;

/**
 * Deletes the clone, which takes its avatar and its access level with it.
 *
 * Nothing needs restoring: the scenarios no longer touch any entry that existed
 * before them, so there is no state to put back.
 */
After(async () => {
	if (!clonedUid) return;
	const uid = clonedUid;
	clonedUid = null;
	ctx.uid = undefined;
	ctx.slug = '';
	ctx.imageStem = undefined;
	await removeClonedEntry(uid);
});

// Must be the real hostname: the backend resolves the Site from it, and Node's
// fetch refuses to override the Host header (a manual one yields 403).
/**
 * The backend of the site this checkout is configured against — must match
 * PUBLIC_ORIGIN in .env. Hardcoding one site's domain makes every scenario
 * read another dataset's entries and fail on data that is simply elsewhere.
 */
const API_ORIGIN = apiOrigin();

/**
 * Per-scenario state.
 *
 * `imageStem` is the file name the picture is stored under, without any
 * thumbnailer suffix — the one thing every rendition of that picture has in
 * common, so a locator built from it matches whichever the page renders.
 * Since the avatar is always one this file seeded onto its own clone, the name
 * is known up front rather than read back from the API.
 */
const ctx: { slug: string; uid?: string; avatar?: unknown; imageStem?: string } = { slug: '' };

async function apiGet(path: string) {
	const response = await fetch(`${API_ORIGIN}${path}`, {
		headers: { Accept: 'application/json' }
	});
	expect(response.ok, `GET ${path} -> ${response.status}`).toBeTruthy();
	return response.json();
}

/**
 * Gives the scenario an entry of its own, with an avatar of its own.
 *
 * A *clone* rather than a borrowed entry, and this is the whole point: these
 * scenarios restrict avatar_access to prove each level, and the previous
 * version mutated a real entry that other features were reading at the same
 * time. That produced a long tail of failures which looked like races but were
 * plain interference — team-carousel resetting this row to "anonymous" on
 * another worker, a memo that skipped re-seeding so a scenario inherited state
 * it never established, an avatar left permanently public after a crashed run.
 * An entry nobody else can see cannot be interfered with, so none of that
 * bookkeeping is needed any more.
 *
 * The clone shares its type, facility, commune and organization with its
 * source, so it appears in the directory listing and the team carousel exactly
 * as the entry it was copied from would.
 */
Given('an entry of this site has an avatar', async ({}) => {
	const organization = await apiGet('/api/v2/organization');
	const entries = (await apiGet('/api/v2/entries')) as {
		entrySlug?: string;
		uid?: string;
		avatar?: unknown;
		active?: boolean;
		memberships?: string[];
	}[];

	// Copy a member of the site's organization: the team carousel only shows
	// members, so cloning a non-member would make the carousel scenarios fail on
	// data rather than on behaviour.
	const members = entries.filter(
		(e) => e.uid && e.active && e.entrySlug && e.memberships?.includes(organization.uid)
	);
	expect(members.length, 'this site has no active entry in its organization').toBeGreaterThan(0);

	const clone = await cloneEntry({ sourceUid: members[0].uid! });
	clonedUid = clone.uid;
	ctx.uid = clone.uid;
	ctx.slug = clone.slug;

	// The clone is created without an image file, so the picture these scenarios
	// hide and reveal is always one of ours: a tagged file whose name we know,
	// never a real person's photograph.
	await seedAvatar({ entryUid: clone.uid, access: 'anonymous' });
	ctx.imageStem = `${SEED_TAG}-${clone.uid}.png`;
});

Given('the avatar access level is {string}', async ({}, access: string) => {
	const out = await djangoShell(`
from addressbook.models import Contact
c = Contact.objects.get(neomodel_uid="${ctx.uid}")
c.avatar_access = "${access}"
c.save()
print("ACCESS_SET", c.avatar_access)
`);
	// djangoShell drops the cached payloads itself. It has to: seeding the
	// clone's avatar just before this warms the cache with the level it was
	// created at, so a read served from that copy would show the picture to a
	// scenario asserting it is hidden.
	expect(out).toContain(`ACCESS_SET ${access}`);
});

When('a signed-out visitor requests the entry', async () => {
	const entry = await apiGet(`/api/v2/fullentries/slug/${ctx.slug}`);
	ctx.avatar = entry.avatar;
});

When('a signed-out visitor requests the directory listing', async () => {
	const entries = await apiGet('/api/v2/entries');
	const found = entries.find((e: { uid: string }) => e.uid === ctx.uid);
	expect(found, `entry ${ctx.uid} missing from listing`).toBeTruthy();
	ctx.avatar = found.avatar;
});

function assertVisibility(avatar: unknown, visibility: string) {
	if (visibility === 'shown') {
		expect(avatar, 'expected the avatar to be sent').not.toBeNull();
	} else {
		expect(avatar, 'expected the avatar to be withheld').toBeNull();
	}
}

Then('the avatar is {string}', async ({}, visibility: string) => {
	assertVisibility(ctx.avatar, visibility);
});

Then('the listed entry avatar is {string}', async ({}, visibility: string) => {
	assertVisibility(ctx.avatar, visibility);
});

When('a signed-out visitor opens the entry page', async ({ page }) => {
	await page.goto(`/e/${ctx.slug}`, { waitUntil: 'domcontentloaded' });
});

Then('no profile picture is rendered on the page', async ({ page }) => {
	// Other entries on the page may legitimately show their own public avatars,
	// so assert specifically that THIS entry's picture is absent.
	await expect(page.locator(`img[src*="/media/profile_images/${ctx.uid}"]`)).toHaveCount(0);
	// And the served HTML must not carry the restricted URL at all.
	expect(await page.content()).not.toContain(`/media/profile_images/${ctx.uid}`);
});

// --- Team carousel (home page) ----------------------------------------------

/**
 * The entry's picture wherever the carousel renders it.
 *
 * Matched on the stored file name rather than the entry uid: uploaded pictures
 * are named after the person, so a uid-based selector matches nothing and makes
 * the negative assertions pass vacuously.
 */
const carouselPicture = (page: import('@playwright/test').Page) => {
	expect(ctx.imageStem, 'no avatar file name recorded for this entry').toBeTruthy();
	return page.locator(`img[src*="${ctx.imageStem}"]`);
};

Given('a signed-out visitor is on the home page', async ({ context, page }) => {
	await context.clearCookies();
	await page.goto('/', { waitUntil: 'networkidle' });
});

When('a signed-out visitor opens the home page', async ({ context, page }) => {
	await context.clearCookies();
	await page.goto('/', { waitUntil: 'networkidle' });
});

When('I open the home page', async ({ page }) => {
	await page.goto('/', { waitUntil: 'networkidle' });
});

// playwright-bdd matches step text regardless of the Given/When/Then keyword,
// so each of these is defined once and reused in both positions.
Then("the team carousel shows the entry's picture", async ({ page }) => {
	await expect(carouselPicture(page).first()).toBeAttached({ timeout: 20_000 });
});

Then("the team carousel does not show the entry's picture", async ({ page }) => {
	await expect(carouselPicture(page)).toHaveCount(0, { timeout: 20_000 });
});

// --- Signing in / out without a manual reload -------------------------------

/**
 * Drives our own /signin page and stubs Google's side of the OAuth round-trip:
 * accounts.google.com is never contacted (it blocks automation), but everything
 * on our side — the real Sign in button, the callback, the session cookie — runs
 * for real.
 */
When(
	'the visitor signs in with Google as {string}',
	async ({ page, context, baseURL }, role: string) => {
		const origin = baseURL ?? 'http://localhost:3000';
		// Intercept the hop to Google and come straight back to the app, with the
		// session already established, mimicking a completed OAuth callback.
		// accounts.google.com is never contacted: it blocks automated browsers.
		await context.route('**/accounts.google.com/**', async (route) => {
			await addSessionCookie(context, role as TestRole, origin);
			await route.fulfill({ status: 302, headers: { location: `${origin}/` } });
		});
		await page.goto('/signin', { waitUntil: 'networkidle' });
		// Scope to the sign-in form: the page also renders theme-picker buttons.
		await page.locator('form[action="/signin"] button').first().click();
		await page.waitForURL((url) => !url.pathname.startsWith('/signin'), { timeout: 30_000 });
	}
);

When('I sign out', async ({ page, context }) => {
	await page.goto('/signout', { waitUntil: 'networkidle' });
	// Scope to the sign-out form: the page also renders theme-picker buttons.
	await page.locator('form[action="/signout"] button').first().click();
	// Signing out clears the session cookie but keeps the user on /signout,
	// so wait for the cookie to disappear rather than for a navigation.
	await expect
		.poll(
			async () =>
				(await context.cookies()).some((c) => c.name === sessionCookieName(API_ORIGIN) && c.value),
			{ timeout: 30_000, message: 'session cookie was not cleared' }
		)
		.toBe(false);
});

/**
 * The app bar's sign-out submits with redirectTo = the current path, so the
 * user lands back on the same page. That is the path where stale avatars used
 * to survive, hence a dedicated step.
 */
When('I sign out from the app bar', async ({ page, context }) => {
	await page
		.locator('form')
		.filter({ has: page.locator('input[name="redirectTo"]') })
		.first()
		.locator('button, [type=submit]')
		.first()
		.click();
	await expect
		.poll(
			async () =>
				(await context.cookies()).some((c) => c.name === sessionCookieName(API_ORIGIN) && c.value),
			{ timeout: 30_000, message: 'session cookie was not cleared' }
		)
		.toBe(false);
});

/**
 * Client-side navigation (SvelteKit router), not a browser reload — the point
 * is that the app refreshes role-scoped data by itself.
 */
When('I navigate back to the home page', async ({ page }) => {
	// Click an in-app link so SvelteKit routes client-side; a page.goto() would
	// be a full browser load and would not prove anything about invalidation.
	await page.locator('a[href="/"]').first().click();
	await page.waitForURL((url) => url.pathname === '/', { timeout: 30_000 });
	await page.waitForLoadState('networkidle');
});

/**
 * The point of these two: the carousel must settle on the new role's avatars
 * from the app's own invalidation, so the assertion deliberately never calls
 * page.reload().
 */
Then(
	"the team carousel shows the entry's picture without a page reload",
	async ({ page }) => {
		await expect(carouselPicture(page).first()).toBeAttached({ timeout: 30_000 });
	}
);

Then(
	"the team carousel does not show the entry's picture without a page reload",
	async ({ page }) => {
		await expect(carouselPicture(page)).toHaveCount(0, { timeout: 30_000 });
	}
);

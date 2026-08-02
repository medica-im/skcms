import { execFile } from 'node:child_process';
import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { SESSION_COOKIE, type TestRole } from '../tests/fixtures/session';
import { addSessionCookie } from './common.steps';
import { seedAvatar, removeSeededAvatar, SEED_TAG } from './seed';

const { Given, When, Then, After } = createBdd();

/** Set when this run gave an entry a picture, so teardown can take it away. */
let seededAvatarUid: string | null = null;

/**
 * These scenarios change avatar_access to prove each level, so without this the
 * dataset is left restricted and the *next* run finds no visible avatar at all.
 */
After(async () => {
	if (ctx.uid) {
		await djangoShell(`
from addressbook.models import Contact
c = Contact.objects.get(neomodel_uid="${ctx.uid}")
c.avatar_access = "anonymous"
c.save()
print("ACCESS_RESTORED")
`);
	}
	if (seededAvatarUid) {
		const uid = seededAvatarUid;
		seededAvatarUid = null;
		await removeSeededAvatar(uid);
	}
});

const BACKEND_DIR = new URL('../../backend', import.meta.url).pathname;
const COMPOSE_FILE = 'docker-compose-development.yml';
// Must be the real hostname: the backend resolves the Site from it, and Node's
// fetch refuses to override the Host header (a manual one yields 403).
/**
 * The backend of the site this checkout is configured against — must match
 * PUBLIC_ORIGIN in .env. Hardcoding one site's domain makes every scenario
 * read another dataset's entries and fail on data that is simply elsewhere.
 */
const API_ORIGIN = process.env.PUBLIC_ORIGIN ?? 'http://dev.sante-gadagne.fr';

/**
 * Per-scenario state.
 *
 * `imageStem` is the file name the entry's picture is stored under, without any
 * thumbnailer suffix — the one thing every rendition of that picture has in
 * common. It is read from the API rather than derived from the uid: uploaded
 * files are named after the person ("florence_senechal-viennot.jpg"), so a
 * locator built from the uid matches nothing outside of seeded avatars.
 */
const ctx: { slug: string; uid?: string; avatar?: unknown; imageStem?: string } = { slug: '' };

/** Run Python in the backend's Django shell (the only way to set avatar_access). */
function djangoShell(code: string): Promise<string> {
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

async function apiGet(path: string) {
	const response = await fetch(`${API_ORIGIN}${path}`, {
		headers: { Accept: 'application/json' }
	});
	expect(response.ok, `GET ${path} -> ${response.status}`).toBeTruthy();
	return response.json();
}

/** Avatar presence never changes during a run; check it once (each shell call is ~10s). */
const avatarChecked = new Set<string>();

/**
 * Records the stored file name of an entry's picture, so the carousel can be
 * searched for it later.
 *
 * The API returns the same image in several renditions — "raw" is the uploaded
 * file, "sm" and "lg" append a thumbnailer suffix to it
 * ("…/x.jpg.256x256_q85_crop-smart.jpg"). Keeping the raw basename therefore
 * matches whichever rendition the carousel happens to render.
 *
 * A restricted avatar is absent from the payload entirely, so a missing one
 * leaves the previous stem in place rather than clearing it: the scenarios that
 * restrict access still need to know what to look for when asserting it is gone.
 */
function rememberImageStem(avatar: unknown): void {
	const urls = avatar as { raw?: string; sm?: string; lg?: string } | null | undefined;
	const raw = urls?.raw ?? urls?.sm ?? urls?.lg;
	if (!raw) return;
	ctx.imageStem = raw.split('/').pop();
}

/**
 * Picks an entry of the site under test that has a picture, instead of naming
 * one: the app serves several datasets and a hardcoded slug only exists in the
 * one it was written against.
 *
 * The entry must also appear in the team carousel, which lists members of the
 * site's organization — otherwise the carousel scenarios have nothing to look
 * for even though the entry exists.
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

	// The entry must belong to the site's organization: the team carousel only
	// shows members, so a non-member would make the carousel scenarios fail on
	// data rather than on behaviour. Inactive entries are listed but 404 on
	// /fullentries/slug, so they are excluded too.
	const members = entries.filter(
		(e) => e.active && e.entrySlug && e.memberships?.includes(organization.uid)
	);
	expect(members.length, 'this site has no active entry in its organization').toBeGreaterThan(0);

	// Prefer one that already has a picture; otherwise give one a seeded avatar
	// so the scenarios do not depend on the dataset containing a photo.
	const candidate = members.find((e) => e.avatar) ?? members[0];
	ctx.slug = candidate.entrySlug!;

	const entry = await apiGet(`/api/v2/fullentries/slug/${ctx.slug}`);
	expect(entry.uid, `entry ${ctx.slug} not found`).toBeTruthy();
	ctx.uid = entry.uid;
	rememberImageStem(entry.avatar);

	if (avatarChecked.has(entry.uid)) return;
	const out = await djangoShell(`
from addressbook.models import Contact
c = Contact.objects.get(neomodel_uid="${entry.uid}")
print("HAS_AVATAR", bool(c.profile_image))
`);
	if (!out.includes('HAS_AVATAR True')) {
		await seedAvatar({ entryUid: entry.uid, access: 'anonymous' });
		seededAvatarUid = entry.uid;
		// Seeding names the file itself, and the payload read above predates it.
		ctx.imageStem = `${SEED_TAG}-${entry.uid}.png`;
	}
	avatarChecked.add(entry.uid);
});

Given('the avatar access level is {string}', async ({}, access: string) => {
	const out = await djangoShell(`
from addressbook.models import Contact
c = Contact.objects.get(neomodel_uid="${ctx.uid}")
c.avatar_access = "${access}"
c.save()
print("ACCESS_SET", c.avatar_access)
`);
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
			async () => (await context.cookies()).some((c) => c.name === SESSION_COOKIE && c.value),
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
			async () => (await context.cookies()).some((c) => c.name === SESSION_COOKIE && c.value),
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

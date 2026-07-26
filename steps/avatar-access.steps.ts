import { execFile } from 'node:child_process';
import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Given, When, Then } = createBdd();

const BACKEND_DIR = new URL('../../backend', import.meta.url).pathname;
const COMPOSE_FILE = 'docker-compose-development.yml';
// Must be the real hostname: the backend resolves the Site from it, and Node's
// fetch refuses to override the Host header (a manual one yields 403).
const API_ORIGIN = 'http://dev.santelyon3.fr';

/** Per-scenario state. */
const ctx: { slug: string; uid?: string; avatar?: unknown } = { slug: '' };

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

Given('the entry {string} has an avatar', async ({}, slug: string) => {
	ctx.slug = slug;
	const entry = await apiGet(`/api/v2/fullentries/slug/${slug}`);
	expect(entry.uid, `entry ${slug} not found`).toBeTruthy();
	ctx.uid = entry.uid;

	if (avatarChecked.has(entry.uid)) return;
	// The avatar must exist regardless of its current access level, so read the DB.
	const out = await djangoShell(`
from addressbook.models import Contact
c = Contact.objects.get(neomodel_uid="${entry.uid}")
print("HAS_AVATAR", bool(c.profile_image))
`);
	expect(out, `entry ${slug} has no profile image`).toContain('HAS_AVATAR True');
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

import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';
import { djangoShell } from './seed';
import { TEST_ACCOUNTS } from '../tests/fixtures/session';

const { Given, When, Then, After } = createBdd(test);

const DIRECTORIES_PATH = '/web/directories';

/** Per-scenario state: the worker site's directory and its owner. */
const ctx: { directory?: string; ownerUid?: string; ownerSlug?: string } = {};

/**
 * This worker site's directory and the organization's entry that owns it.
 *
 * Read from the graph, not the page: the scenario is about what the page does
 * to that entry, so it has to know which one it is beforehand.
 */
async function resolveOwner(baseURL: string) {
	const host = new URL(baseURL).hostname;
	const out = await djangoShell(
		`
from neomodel import db
from django.contrib.sites.models import Site
from directory.models import Directory
d = Directory.objects.get(site=Site.objects.get(domain="${host}"))
rows, _ = db.cypher_query(
    "MATCH (:Directory {name: $name})-[:OWNED_BY]->(o:Entry) RETURN o.uid, o.slug",
    {"name": d.name},
)
print("OWNER", d.name, *(rows[0] if rows else []))
`,
		{ readOnly: true }
	);
	const [, directory, uid, slug] = out.trim().split('\n').pop()!.split(' ');
	expect(uid, `${directory} has no OWNED_BY owner: re-run seed_worker_sites.py`).toBeTruthy();
	Object.assign(ctx, { directory, ownerUid: uid, ownerSlug: slug });
}

/** Sets the switch straight in the graph; `null` removes it (the default). djangoShell clears the cache. */
async function setSwitch(value: boolean | null) {
	const cypher =
		value === null
			? 'MATCH (d:Directory {name: $name}) REMOVE d.list_owner_entry'
			: `MATCH (d:Directory {name: $name}) SET d.list_owner_entry = ${value ? 'true' : 'false'}`;
	await djangoShell(`
from neomodel import db
db.cypher_query("${cypher}", {"name": "${ctx.directory}"})
`);
}

/** What the address book reads: the site's entries, as an anonymous visitor gets them. */
async function listedUids(baseURL: string): Promise<string[]> {
	const response = await fetch(`${new URL(baseURL).origin}/api/v2/entries`);
	expect(response.ok, `GET /api/v2/entries -> ${response.status}`).toBe(true);
	return ((await response.json()) as { uid: string }[]).map((e) => e.uid);
}

After(async () => {
	if (!ctx.directory) return;
	await setSwitch(null);
	ctx.directory = ctx.ownerUid = ctx.ownerSlug = undefined;
});

Given("this site's directory lists its organization's entry", async ({ baseURL }) => {
	await resolveOwner(baseURL);
	await setSwitch(null);
});

Given("this site's directory does not list its organization's entry", async ({ baseURL }) => {
	if (!ctx.directory) await resolveOwner(baseURL);
	await setSwitch(false);
});

When('I open the directories page', async ({ page }) => {
	await page.goto(DIRECTORIES_PATH);
});

const toggle = (page: import('@playwright/test').Page) =>
	page
		.locator(`[data-testid="directory-row"][data-directory="${ctx.directory}"]`)
		.getByRole('switch');

async function turn(page: import('@playwright/test').Page, on: boolean) {
	const control = toggle(page);
	const input = control.locator('input');
	await expect(control).toHaveAttribute('aria-checked', on ? 'false' : 'true');
	// Enabled only once hydrated (DirectorySettingsRow): before that a click
	// flips the box natively and nothing is saved.
	await expect(input).toBeEnabled();
	const saved = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('/_app/remote/'));
	await control.click();
	await expect(control).toHaveAttribute('aria-checked', on ? 'true' : 'false');
	await saved;
	// A refusal would put the toggle back and say so.
	await expect(input).toBeEnabled();
	await expect(page.getByRole('alert')).toHaveCount(0);
	await expect(control).toHaveAttribute('aria-checked', on ? 'true' : 'false');
}

When("I turn off the organization's entry", async ({ page }) => {
	await turn(page, false);
});

When("I turn on the organization's entry", async ({ page }) => {
	await turn(page, true);
});

Then("the address book no longer lists the organization's entry", async ({ baseURL }) => {
	await expect.poll(() => listedUids(baseURL)).not.toContain(ctx.ownerUid);
});

Then("the address book lists the organization's entry", async ({ baseURL }) => {
	await expect.poll(() => listedUids(baseURL)).toContain(ctx.ownerUid);
});

Then("the organization's entry page still opens", async ({ page }) => {
	expect(ctx.ownerSlug, "the organization's entry has no slug").toBeTruthy();
	const response = await page.goto(`/e/${ctx.ownerSlug}`);
	expect(response?.status()).toBe(200);
});

When(
	'I follow the user menu to the entries table, without reloading',
	async ({ page }) => {
		// A marker on window survives a client-side navigation and dies with a
		// reload: proof the table below is fed by the layout data already held.
		await page.evaluate(() => ((window as any).__sameDocument = true));
		const menu = page.locator('[data-popup="user"]');
		const link = menu.locator('a[href$="/web/entries"]');
		const trigger = page.getByRole('button', { name: TEST_ACCOUNTS.superuser.name });
		await expect(async () => {
			await trigger.click();
			await expect(link).toBeVisible({ timeout: 1_000 });
		}).toPass({ timeout: 10_000 });
		// Dispatched rather than clicked: the popup keeps being repositioned, so
		// the link never counts as "stable". SvelteKit's router still takes the
		// click, and the marker check below proves it did not reload.
		await link.dispatchEvent('click');
		await expect(page).toHaveURL(/\/web\/entries$/);
		expect(await page.evaluate(() => (window as any).__sameDocument)).toBe(true);
	}
);

Then("the entries table does not list the organization's entry", async ({ page }) => {
	// Rows first, or "absent" would pass on a table still loading.
	await expect.poll(() => page.locator('tbody tr').count(), { timeout: 8_000 }).toBeGreaterThan(0);
	await expect(page.locator(`tbody a[href$="/e/${ctx.ownerSlug}"]`)).toHaveCount(0);
});

Then('the user menu has a link to the directories page', async ({ page }) => {
	await expect(page.locator(`[data-popup="user"] a[href$="${DIRECTORIES_PATH}"]`)).toHaveCount(1);
});

Then('the user menu has no link to the directories page', async ({ page }) => {
	// Wait for the menu itself, or "no link" would pass on a page still loading.
	await expect(page.locator('[data-popup="user"]')).toHaveCount(1);
	await expect(page.locator(`[data-popup="user"] a[href$="${DIRECTORIES_PATH}"]`)).toHaveCount(0);
});

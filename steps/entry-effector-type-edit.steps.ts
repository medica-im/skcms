import { createBdd } from 'playwright-bdd';
import { test, expect } from './fixtures';
import { djangoShell } from './seed';
import { setSwitch } from './facilityContext';
import { ctx as creation, asStaff, pick } from './entry-creation-flow.steps';

const { Given, When, Then, After } = createBdd(test);

type Page = import('@playwright/test').Page;

// The person, the facility and their entries are made and removed by
// entry-creation-flow.steps.ts (the feature carries its tag too); here, the
// entry of the scenario, its former slugs and the organization's windows.

const ctx: { entryUid?: string; slug?: string; formerSlug?: string; host?: string; windowsChanged?: boolean } = {};

const organization = (host: string) =>
	`from facility.models import Organization\norg = Organization.objects.get(site__domain=${JSON.stringify(host)})\n`;

After({ tags: '@entry-type-edit' }, async () => {
	const { entryUid, host, windowsChanged } = ctx;
	Object.assign(ctx, { entryUid: undefined, slug: undefined, formerSlug: undefined, host: undefined, windowsChanged: false });
	if (entryUid) {
		await djangoShell(
			`from directory.models import EntrySlug\nEntrySlug.objects.filter(entry_uid=${JSON.stringify(entryUid)}).delete()`,
			{ readOnly: true }
		);
	}
	if (host && windowsChanged) {
		await djangoShell(
			`${organization(host)}org.entry_type_edit_days_administrator = 30\norg.entry_type_edit_days_connected = 7\norg.save()`
		);
	}
});

async function typeUid(origin: string, name: string): Promise<string> {
	const types = (await (await fetch(`${origin}/api/v2/effector-types`)).json()) as { uid: string; name_fr: string }[];
	const type = types.find((t) => t.name_fr === name);
	expect(type, `no effector type named ${name}`).toBeTruthy();
	return type!.uid;
}

async function entryAs(origin: string, typeName: string) {
	return asStaff(origin, '/api/v2/entries', {
		effector: creation.personUid,
		facility: creation.facilityUid,
		effector_type: await typeUid(origin, typeName),
		access: 'anonymous',
		isOwner: false,
		memberships: []
	});
}

Given('an entry for them as {string}, created by that staff member', async ({ baseURL }, typeName: string) => {
	const origin = new URL(baseURL).origin;
	const entry = await entryAs(origin, typeName);
	ctx.entryUid = entry.uid;
	ctx.slug = entry.entrySlug ?? entry.slug;
	ctx.host = new URL(baseURL).hostname;
	expect(ctx.slug, `the new entry has no slug: ${JSON.stringify(entry)}`).toBeTruthy();
});

Given('another entry for them as {string}, created by that staff member', async ({ baseURL }, typeName: string) => {
	await entryAs(new URL(baseURL).origin, typeName);
});

Given('the entry was created {int} days ago', async ({}, days: number) => {
	const at = Date.now() - days * 24 * 60 * 60 * 1000;
	await djangoShell(
		`from neomodel import db\ndb.cypher_query("MATCH (e:Entry {uid: $uid}) SET e.createdAt = $at", {"uid": ${JSON.stringify(ctx.entryUid)}, "at": ${at}})`
	);
});

Given('the organization lets administrators change an occupation for {int} days', async ({ baseURL }, days: number) => {
	ctx.host = new URL(baseURL).hostname;
	ctx.windowsChanged = true;
	await djangoShell(`${organization(ctx.host)}org.entry_type_edit_days_administrator = ${days}\norg.save()`);
});

When('I open that entry in edit mode', async ({ page }) => {
	await page.goto(`/e/${ctx.slug}`, { waitUntil: 'networkidle' });
	const toggle = page.getByRole('switch').first();
	await expect(toggle).toBeVisible({ timeout: 8_000 });
	await setSwitch(toggle, true);
});

const pen = (page: Page) => page.getByTestId('entry-type-edit');
const barredPen = (page: Page) => page.getByTestId('entry-type-edit-locked');

async function openDialog(page: Page, control: import('@playwright/test').Locator) {
	await expect(async () => {
		await control.click();
		await expect(page.getByTestId('entry-type-dialog')).toBeVisible({ timeout: 2_000 });
	}).toPass({ timeout: 20_000 });
}

When('I change its occupation to {string}', async ({ page }, typeName: string) => {
	ctx.formerSlug = ctx.slug;
	await openDialog(page, pen(page));
	await pick(page, 'Sélectionner une catégorie', typeName);
	await page.getByTestId('entry-type-save').click();
});

Then('the entry is listed as {string}', async ({ page }, typeName: string) => {
	await expect(page.getByRole('heading', { level: 3, name: typeName })).toBeVisible({ timeout: 15_000 });
	ctx.slug = new URL(page.url()).pathname.split('/e/')[1];
});

Then('the entry has a new address', async () => {
	expect(ctx.slug).toBeTruthy();
	expect(ctx.slug).not.toBe(ctx.formerSlug);
});

Then('its former address leads to it', async ({ page }) => {
	await page.goto(`/e/${ctx.formerSlug}`, { waitUntil: 'domcontentloaded' });
	await expect(page).toHaveURL(new RegExp(`/e/${ctx.slug}$`));
});

Then('the occupation cannot be changed any more', async ({ page }) => {
	await expect(barredPen(page)).toBeVisible();
	await expect(barredPen(page)).toHaveAccessibleName('La catégorie ne peut plus être modifiée');
	await expect(pen(page)).toHaveCount(0);
});

Then('the occupation can be changed', async ({ page }) => {
	await expect(pen(page)).toBeVisible();
	await expect(barredPen(page)).toHaveCount(0);
});

When('I ask why', async ({ page }) => {
	await openDialog(page, barredPen(page));
});

Then('I am told it was created more than {int} days ago', async ({ page }, days: number) => {
	await expect(page.getByTestId('entry-type-locked-reason')).toContainText(`plus de ${days} jours`);
});

Then('I am offered to create a new entry with the same facility and person', async ({ page }) => {
	const link = page.getByTestId('entry-type-recreate');
	await expect(link).toHaveAttribute('href', new RegExp(`/web/entry\\?facility=${creation.facilityUid}&effector=${creation.personUid}$`));
});

Then('I am told such an entry already exists, with a link to it', async ({ page }) => {
	const refusal = page.getByTestId('entry-type-refusal');
	await expect(refusal).toContainText('Une entrée existe déjà');
	await expect(refusal.getByRole('link', { name: 'Voir cette entrée' })).toHaveAttribute('href', /\/e\/.+/);
});

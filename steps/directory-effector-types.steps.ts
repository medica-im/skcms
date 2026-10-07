import { createBdd } from 'playwright-bdd';
import { test, expect } from './fixtures';
import { djangoShell } from './seed';
import { pick } from './entry-creation-flow.steps';

const { Given, When, Then, After } = createBdd(test);

type Page = import('@playwright/test').Page;

// "I open the directories page" lives in directory-owner-entry.steps.ts, the
// creation steps in entry-creation-flow.steps.ts and staff-creates-entry.steps.ts.

const CATEGORY = 'Sélectionner une catégorie';

/** Per-scenario state: the worker site's directory, so After can lift the limit. */
const ctx: { directory?: string } = {};

const names = (list: string) => list.split(',').map((s) => s.trim());

/** The worker site's directory, by its Django Directory.site. */
async function resolveDirectory(baseURL: string) {
	const host = new URL(baseURL).hostname;
	const out = await djangoShell(
		`
from django.contrib.sites.models import Site
from directory.models import Directory
print("DIRECTORY", Directory.objects.get(site=Site.objects.get(domain="${host}")).name)
`,
		{ readOnly: true }
	);
	ctx.directory = out.trim().split('\n').pop()!.split(' ')[1];
}

/** Offers exactly these categories (real ones, by name_fr); none: every category. */
async function offerOnly(categories: string[]) {
	await djangoShell(`
from neomodel import db
db.cypher_query("MATCH (:Directory {name: $name})-[r:OFFERS_EFFECTOR_TYPE]->() DELETE r", {"name": ${JSON.stringify(ctx.directory)}})
db.cypher_query(
    "MATCH (d:Directory {name: $name}), (t:EffectorType) WHERE t.name_fr IN $types MERGE (d)-[:OFFERS_EFFECTOR_TYPE]->(t)",
    {"name": ${JSON.stringify(ctx.directory)}, "types": ${JSON.stringify(categories)}},
)
`);
}

After(async () => {
	if (!ctx.directory) return;
	await offerOnly([]);
	ctx.directory = undefined;
});

Given("this site's directory offers every category", async ({ baseURL }) => {
	await resolveDirectory(baseURL);
	await offerOnly([]);
});

Given("this site's directory offers only {string}", async ({ baseURL }, list: string) => {
	if (!ctx.directory) await resolveDirectory(baseURL);
	await offerOnly(names(list));
});

const row = (page: Page) => page.locator(`[data-testid="directory-row"][data-directory="${ctx.directory}"]`);
const overlay = (page: Page) => row(page).getByTestId('directory-types-dialog');

/** Waits for the command's round trip; a refusal would say so in the overlay. */
async function saving(page: Page, act: () => Promise<void>) {
	const saved = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('/_app/remote/'));
	await act();
	await saved;
	await expect(overlay(page).getByRole('alert')).toHaveCount(0);
}

When("I edit the directory's categories", async ({ page }) => {
	const edit = row(page).getByRole('button', { name: 'Modifier les catégories' });
	// Enabled once hydrated; before that a click opens nothing.
	await expect(edit).toBeEnabled();
	await edit.click();
	await expect(overlay(page)).toBeVisible();
});

When('I add the category {string}', async ({ page }, name: string) => {
	await pick(page, CATEGORY, name);
	const add = overlay(page).getByRole('button', { name: 'Ajouter' });
	await expect(add).toBeEnabled();
	await saving(page, () => add.click());
	await expect(overlay(page).getByRole('button', { name: `Retirer ${name}` })).toBeVisible();
	// The picker is emptied for the next one.
	await expect(add).toBeDisabled();
});

When('I remove all the categories', async ({ page }) => {
	await overlay(page).getByRole('button', { name: 'Retirer toutes les catégories' }).click();
	await saving(page, () => overlay(page).getByTestId('directory-types-clear-confirm').click());
});

When('I close the categories overlay', async ({ page }) => {
	await overlay(page).getByRole('button', { name: 'Fermer' }).click();
	await expect(overlay(page)).toBeHidden();
});

Then('the directories page shows the categories {string}', async ({ page }, list: string) => {
	await expect(row(page).getByTestId('directory-types-summary').locator('li')).toHaveText(names(list));
});

Then('the directories page says every category is offered', async ({ page }) => {
	await expect(row(page).getByTestId('directory-types-all')).toBeVisible();
	await expect(row(page).getByTestId('directory-types-summary')).toHaveCount(0);
});

/** The picker's options with nothing typed: what it offers. */
async function offered(page: Page): Promise<string[]> {
	const input = page.getByPlaceholder(CATEGORY).last();
	const items = page.locator('.svelte-select-list .item');
	let labels: string[] = [];
	await expect(async () => {
		await input.click();
		await expect(items.first()).toBeVisible({ timeout: 2_000 });
		labels = (await items.allInnerTexts()).map((s) => s.trim());
	}).toPass({ timeout: 20_000 });
	await page.keyboard.press('Escape');
	return labels;
}

Then('the category picker offers only {string}', async ({ page }, list: string) => {
	await expect.poll(() => offered(page)).toEqual(names(list));
});

Then('the category picker offers {string}', async ({ page }, name: string) => {
	await expect.poll(() => offered(page)).toContain(name);
});

When('I show every category', async ({ page }) => {
	await page.getByRole('switch', { name: 'Afficher toutes les catégories' }).click();
});

Then("the categories' controls are at least 44 pixels tall", async ({ page }) => {
	const controls = overlay(page).getByRole('button');
	await expect(controls.first()).toBeVisible();
	const heights = await controls.evaluateAll((els) =>
		els.map((e) => [e.getAttribute('aria-label') ?? e.textContent?.trim(), e.getBoundingClientRect().height])
	);
	for (const [name, height] of heights) {
		expect(height, `${name}`).toBeGreaterThanOrEqual(44);
	}
});

Then('the categories overlay fits the screen', async ({ page }) => {
	const box = await overlay(page).boundingBox();
	const width = page.viewportSize()!.width;
	expect(box, 'the overlay is not on screen').not.toBeNull();
	expect(box!.x).toBeGreaterThanOrEqual(0);
	expect(box!.x + box!.width).toBeLessThanOrEqual(width);
});

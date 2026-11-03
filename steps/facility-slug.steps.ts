import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';
import { djangoShell, SEED_TAG } from './seed';
import { ctx, editDialog, seedFacility } from './facility-gps.steps';

const { Given, When, Then, After } = createBdd(test);

const holder: { uid?: string; slug?: string } = {};
const chosen: { slug?: string } = {};

const unique = () => `${SEED_TAG.toLowerCase()}-${Math.random().toString(36).slice(2, 8)}`;
const slugInput = (page: import('@playwright/test').Page) => editDialog(page).locator('input[name="slug"]');
const status = (page: import('@playwright/test').Page) => editDialog(page).getByTestId('slug-status');
const submit = (page: import('@playwright/test').Page) => editDialog(page).getByRole('button', { name: 'Envoyer' });

/** The facility as stored in the graph, bypassing every API cache. */
async function stored(): Promise<{ slug: string | null; name: string | null }> {
	const out = await djangoShell(
		`
import json
from neomodel import db
rows, _ = db.cypher_query("MATCH (f:Facility {uid: $uid}) RETURN f.slug, f.name", {"uid": ${JSON.stringify(ctx.uid)}})
print("STORED", json.dumps({"slug": rows[0][0], "name": rows[0][1]}))
`,
		{ readOnly: true }
	);
	const match = out.match(/STORED (.+)/);
	if (!match) throw new Error(`reading facility failed: ${out}`);
	return JSON.parse(match[1]);
}

After(async () => {
	if (!holder.uid) return;
	const uid = holder.uid;
	holder.uid = holder.slug = undefined;
	await djangoShell(`
from neomodel import db
db.cypher_query("MATCH (f:Facility {uid: $uid}) WHERE f.${SEED_TAG} DETACH DELETE f", {"uid": ${JSON.stringify(uid)}})
`);
});

Given('a facility of this site', async ({}) => {
	await seedFacility({ located: true });
});

Given('another facility holds an address', async ({}) => {
	const slug = `e2e-slug-holder-${unique()}`;
	const out = await djangoShell(`
from neomodel import db
rows, _ = db.cypher_query("""
MATCH (model:Facility)-[:LOCATED_IN_THE_ADMINISTRATIVE_TERRITORIAL_ENTITY]->(commune:Commune)
WHERE model.location IS NOT NULL
WITH commune LIMIT 1
CREATE (f:Facility {uid: randomUUID(), name: 'e2e slug holder', slug: $slug, ${SEED_TAG}: true})
MERGE (f)-[:LOCATED_IN_THE_ADMINISTRATIVE_TERRITORIAL_ENTITY]->(commune)
RETURN f.uid
""", {"slug": ${JSON.stringify(slug)}})
print("HOLDER_SEEDED", rows[0][0])
`);
	const match = out.match(/HOLDER_SEEDED (\S+)/);
	if (!match) throw new Error(`seeding the other facility failed: ${out}`);
	holder.uid = match[1];
	holder.slug = slug;
});

When('I rename it to {string}', async ({ page }, name: string) => {
	const field = editDialog(page).locator('input[name="name"]');
	await field.fill(name);
	await field.blur();
});

When('I change its address to the one the other facility holds', async ({ page }) => {
	await slugInput(page).fill(holder.slug!);
});

When('I change its address to a free one', async ({ page }) => {
	chosen.slug = `e2e-slug-free-${unique()}`;
	await slugInput(page).fill(chosen.slug);
});

When('I choose the first offered address', async ({ page }) => {
	const first = editDialog(page).getByTestId('slug-suggestions').getByRole('button').first();
	chosen.slug = (await first.innerText()).trim();
	await first.click();
});

Then("the dialog shows the facility's address", async ({ page }) => {
	await expect(slugInput(page)).toHaveValue(ctx.slug!);
});

Then('the address is unchanged', async ({ page }) => {
	await expect(status(page)).toHaveAttribute('data-status', 'free');
	await expect(status(page)).toContainText('inchangée');
});

Then('I am told the address is already used', async ({ page }) => {
	await expect(status(page)).toHaveAttribute('data-status', 'taken', { timeout: 10_000 });
	await expect(status(page)).toContainText('déjà utilisée');
});

Then('I am offered free addresses', async ({ page }) => {
	const offered = editDialog(page).getByTestId('slug-suggestions').getByRole('button');
	await expect(offered.first()).toBeVisible();
	expect(await offered.allInnerTexts()).not.toContain(holder.slug);
});

Then('the address is available', async ({ page }) => {
	await expect(status(page)).toHaveAttribute('data-status', 'free', { timeout: 10_000 });
	await expect(slugInput(page)).toHaveValue(chosen.slug!);
});

Then('I am warned that the old address stops working', async ({ page }) => {
	await expect(editDialog(page).getByTestId('slug-warning')).toContainText('ancienne adresse');
});

Then('the facility edit cannot be submitted', async ({ page }) => {
	await expect(submit(page)).toBeDisabled();
});

Then('the facility edit can be submitted', async ({ page }) => {
	await expect(submit(page)).toBeEnabled({ timeout: 10_000 });
});

Then('the facility is still at its address', async ({ page }) => {
	await expect(editDialog(page).getByRole('button', { name: 'Fermer' })).toBeVisible({ timeout: 10_000 });
	const facility = await stored();
	expect(facility.name, 'the rename was not saved at all').toBe('Cabinet renommé');
	expect(facility.slug).toBe(ctx.slug);
});

Then('the facility is stored at the new address', async ({}) => {
	await expect.poll(async () => (await stored()).slug, { timeout: 15_000 }).toBe(chosen.slug);
});

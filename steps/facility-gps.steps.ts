import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';
import { djangoShell, SEED_TAG } from './seed';
import { enterEditMode } from './facilityContext';
import { apiOrigin } from '../tests/fixtures/session';

const { Given, When, Then, After } = createBdd(test);

const SITE_DOMAIN = process.env.SEED_SITE_DOMAIN ?? new URL(apiOrigin()).hostname;

const ctx: { uid?: string; slug?: string } = {};

const editDialog = (page: import('@playwright/test').Page) =>
	page.locator('dialog[open]').filter({ has: page.locator('input[name="latitude"]') });

/**
 * A facility of our own: these scenarios change its position and fields, and a
 * facility borrowed from the shared dataset would be changed under a sibling
 * worker. Shaped like aFacility() in facility-place-image.steps.ts, so that
 * /sites/<slug> serves it.
 */
const BAN_ID = '84007_5020_00001';
const BAN_BANID = '93507b74-65da-4da8-8028-74ff47dbe1d4';

const python = (value: string | null | undefined) =>
	value == null ? 'None' : JSON.stringify(value);

async function seedFacility(options: {
	located: boolean;
	zoom?: number;
	complement?: string | null;
	banIds?: boolean;
}) {
	const slug = `e2e-gps-facility-${SEED_TAG.toLowerCase()}-${Math.random().toString(36).slice(2, 8)}`;
	const out = await djangoShell(`
from neomodel import db
from directory.models.core import Directory
from django.contrib.sites.models import Site

site = Site.objects.get(domain=${JSON.stringify(SITE_DOMAIN)})
directory = Directory.objects.filter(site=site).first()
assert directory, "no directory for site"

rows, _ = db.cypher_query("""
MATCH (f:Facility)-[:LOCATED_IN_THE_ADMINISTRATIVE_TERRITORIAL_ENTITY]->(:Commune)-[:LOCATED_IN_THE_ADMINISTRATIVE_TERRITORIAL_ENTITY*]->(:Country)
WHERE f.location IS NOT NULL
RETURN f.uid LIMIT 1
""")
assert rows, "no located facility with a full geography chain to model the seeded one on"
model_uid = rows[0][0]

rows, _ = db.cypher_query("MATCH (e:Effector) RETURN e.uid LIMIT 1")
effector_uid = rows[0][0]

rows, _ = db.cypher_query("""
MATCH (model:Facility {uid: $model})-[:LOCATED_IN_THE_ADMINISTRATIVE_TERRITORIAL_ENTITY]->(commune:Commune)
CREATE (f:Facility {uid: randomUUID(), name: 'e2e gps facility', slug: $slug,
                    street: '1 rue du Test', zip: '69003', zoom: $zoom,
                    geographical_complement: $complement,
                    ban_id: $banId, ban_banId: $banBanId, ${SEED_TAG}: true})
SET f.location = CASE WHEN $located THEN model.location ELSE null END
MERGE (f)-[:LOCATED_IN_THE_ADMINISTRATIVE_TERRITORIAL_ENTITY]->(commune)
WITH f
MATCH (d:Directory {name: $dir})
MATCH (ef:Effector {uid: $effector})
CREATE (e:Entry {uid: randomUUID(), slug: $slug + '-entry', active: true, ${SEED_TAG}: true})
CREATE (e)-[:HAS_FACILITY]->(f)
CREATE (e)-[:HAS_EFFECTOR]->(ef)
MERGE (d)-[:HAS_ENTRY]->(e)
RETURN f.uid, f.slug
""", {"model": model_uid, "slug": ${JSON.stringify(slug)}, "dir": directory.name,
      "effector": effector_uid, "located": ${options.located ? 'True' : 'False'},
      "zoom": ${options.zoom ?? 18}, "complement": ${python(options.complement)},
      "banId": ${python(options.banIds ? BAN_ID : null)},
      "banBanId": ${python(options.banIds ? BAN_BANID : null)}})
print("GPS_FACILITY_SEEDED", rows[0][0], rows[0][1])
`);
	const match = out.match(/GPS_FACILITY_SEEDED (\S+) (\S+)/);
	if (!match) throw new Error(`seeding facility failed: ${out}`);
	ctx.uid = match[1];
	ctx.slug = match[2];
}

/** The facility as stored in the graph, bypassing every API cache. */
async function storedFacility(): Promise<{
	location: [number, number] | null;
	building: string | null;
	zoom: number | null;
	complement: string | null;
	banId: string | null;
	banBanId: string | null;
}> {
	const out = await djangoShell(
		`
import json
from neomodel import db
rows, _ = db.cypher_query("""
MATCH (f:Facility {uid: $uid})
RETURN f.location.x, f.location.y, f.building, f.zoom, f.geographical_complement,
       f.ban_id, f.ban_banId
""", {"uid": ${JSON.stringify(ctx.uid)}})
x, y, building, zoom, complement, ban_id, ban_banId = rows[0]
print("STORED", json.dumps({"location": None if x is None else [x, y], "building": building,
                            "zoom": zoom, "complement": complement,
                            "banId": ban_id, "banBanId": ban_banId}))
`,
		{ readOnly: true }
	);
	const match = out.match(/STORED (.+)/);
	if (!match) throw new Error(`reading facility failed: ${out}`);
	return JSON.parse(match[1]);
}

After(async () => {
	if (!ctx.uid) return;
	const uid = ctx.uid;
	ctx.uid = undefined;
	ctx.slug = undefined;
	await djangoShell(`
from neomodel import db
db.cypher_query("""
MATCH (f:Facility {uid: $uid}) WHERE f.${SEED_TAG}
OPTIONAL MATCH (f)<-[:HAS_FACILITY]-(e:Entry) WHERE e.${SEED_TAG}
DETACH DELETE f, e
""", {"uid": ${JSON.stringify(uid)}})
`);
});

Given('a facility of this site has no GPS position', async ({}) => {
	await seedFacility({ located: false });
});

Given(
	'a facility of this site has zoom {int}, the complement {string} and BAN ids',
	async ({}, zoom: number, complement: string) => {
		await seedFacility({ located: true, zoom, complement, banIds: true });
	}
);

When('I open the page of that facility in edit mode', async ({ page }) => {
	await page.goto(`/sites/${ctx.slug}`, { waitUntil: 'networkidle' });
	await enterEditMode(page);
});

Given('I open the edit dialog of that facility', async ({ page }) => {
	await page.goto(`/sites/${ctx.slug}`, { waitUntil: 'networkidle' });
	await enterEditMode(page);
	await page.getByRole('button', { name: /Modifier l'établissement/i }).first().click();
	await expect(editDialog(page)).toBeVisible({ timeout: 8_000 });
});

When('I change its building to {string}', async ({ page }, building: string) => {
	const field = editDialog(page).locator('input[name="building"]');
	await field.fill(building);
	await field.blur();
});

When('I submit the facility edit dialog', async ({ page }) => {
	const submit = editDialog(page).getByRole('button', { name: 'Envoyer' });
	await expect(submit).toBeEnabled({ timeout: 8_000 });
	await submit.click();
});

Then('I am told the facility will not appear on the map', async ({ page }) => {
	const warning = page.getByTestId('missing-gps-dialog');
	await expect(warning).toBeVisible();
	await expect(warning).toContainText("n'apparaîtra sur aucune carte");
});

When('I choose to use the geocoder', async ({ page }) => {
	await page.getByRole('button', { name: 'Utiliser le géocodeur' }).click();
});

When('I choose to save without a position', async ({ page }) => {
	await page.getByRole('button', { name: 'Enregistrer sans position' }).click();
});

Then('the geocoder is highlighted and has the focus', async ({ page }) => {
	await expect(page.getByTestId('missing-gps-dialog')).toBeHidden();
	await expect(editDialog(page).getByTestId('geocoder-glow')).toHaveAttribute('data-glow', 'true');
	await expect(editDialog(page).locator('input[name="geocoder"]')).toBeFocused();
});

Then('the facility still has no saved building', async ({}) => {
	expect((await storedFacility()).building).toBeNull();
});

Then('the facility edit is saved', async ({ page }) => {
	await expect(editDialog(page).getByRole('button', { name: 'Fermer' })).toBeVisible({
		timeout: 8_000
	});
});

Then('the facility is stored with no position', async ({}) => {
	const stored = await storedFacility();
	expect(stored.building, 'the edit was not saved at all').toBe('Bâtiment GPS');
	expect(stored.location).toBeNull();
});

Then(
	'the facility is stored with zoom {int} and the complement {string}',
	async ({}, zoom: number, complement: string) => {
		const stored = await storedFacility();
		expect(stored.building, 'the edit was not saved at all').toBe('Bâtiment GPS');
		expect(stored.zoom).toBe(zoom);
		expect(stored.complement).toBe(complement);
	}
);

Then('the facility keeps its BAN ids', async ({}) => {
	const stored = await storedFacility();
	expect(stored.banId).toBe(BAN_ID);
	expect(stored.banBanId).toBe(BAN_BANID);
});

Then('the page flags the missing GPS position', async ({ page }) => {
	await expect(page.getByTestId('facility-gps-missing')).toBeVisible();
});

Then('the page shows no map of the facility', async ({ page }) => {
	// Not the edit dialog's own picker map, which is there whenever the dialog is open.
	await expect(page.locator('.maplibregl-map:not(dialog .maplibregl-map)')).toHaveCount(0);
});

Then('the map in the dialog says {string}', async ({ page }, hint: string) => {
	await expect(editDialog(page).getByTestId('add-marker-hint')).toHaveText(hint);
});

When('I click the map in the dialog', async ({ page }) => {
	const canvas = editDialog(page).locator('.maplibregl-canvas');
	await expect(canvas).toBeVisible({ timeout: 15_000 });
	await canvas.click();
});

Then('the latitude and longitude fields are filled', async ({ page }) => {
	for (const name of ['latitude', 'longitude']) {
		await expect(editDialog(page).locator(`input[name="${name}"]`)).toHaveValue(/^-?\d+(\.\d+)?$/);
	}
});

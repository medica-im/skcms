import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';
import { djangoShell, clearApiCache, SEED_TAG } from './seed';
import { facilityCtx, enterEditMode } from './facilityContext';
import { apiOrigin } from '../tests/fixtures/session';

const { Given, When, Then, After } = createBdd(test);

/** Backend of the site under test, read from PUBLIC_ORIGIN in .env. */
const API_ORIGIN = apiOrigin();

/** Shared, so the facility page steps defined elsewhere find what we created. */
const ctx: typeof facilityCtx & { created?: boolean } = facilityCtx;

const editFacilityButton = (page: import('@playwright/test').Page) =>
	page.getByRole('button', { name: /Modifier l'établissement/i }).first();
const addPictureButton = (page: import('@playwright/test').Page) =>
	page.getByRole('button', { name: /photo du lieu/i }).first();

/** These scenarios create facilities for real, so take them away again. */
After(async () => {
	if (ctx.created) {
		ctx.created = false;
		await djangoShell(`
from neomodel import db
db.cypher_query("MATCH (f:Facility) WHERE f.slug STARTS WITH 'e2e-staff-created' DETACH DELETE f")
print("CLEANED")
`);
		await clearApiCache();
	}
	ctx.uid = undefined;
	ctx.slug = undefined;
	ctx.status = undefined;
	ctx.body = undefined;
});

When('I start creating an entry', async ({ page }) => {
	await page.goto('/web/entry', { waitUntil: 'networkidle' });
});

/**
 * The facility step of the entry form must offer creation, not merely a list to
 * pick from: a staff user filling in their own entry is usually the first
 * person to describe the place they work at.
 */
Then('I can create a facility from there', async ({ page }) => {
	await expect(
		page.getByRole('button', { name: /Créer un établissement/i }).first()
	).toBeVisible({ timeout: 20_000 });
});

/** A commune is required by FacilityPost, so borrow one the site already uses. */
async function aCommuneUid(): Promise<string> {
	const response = await fetch(`${API_ORIGIN}/api/v2/public/facilities`, {
		headers: { Accept: 'application/json' }
	});
	const facilities = (await response.json()) as { commune?: string }[];
	const commune = facilities.find((f) => f.commune)?.commune;
	expect(commune, 'no commune found on this site').toBeTruthy();
	return commune!;
}

async function createFacility(page: import('@playwright/test').Page) {
	const commune = await aCommuneUid();
	const suffix = Date.now();
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	return page.evaluate(
		async ([communeUid, unique]) => {
			const response = await fetch('/api/v2/facilities/', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					name: `e2e staff created ${unique}`,
					label: `e2e staff created ${unique}`,
					slug: `e2e-staff-created-${unique}`,
					building: null,
					street: '1 rue de test',
					geographical_complement: null,
					zip: '84470',
					ban_id: null,
					ban_banId: null,
					commune: communeUid
				})
			});
			return { status: response.status, body: await response.text() };
		},
		[commune, String(suffix)] as const
	);
}

When('I create a facility through the API', async ({ page }) => {
	const result = await createFacility(page);
	ctx.status = result.status;
	ctx.body = result.body;
	if (result.status < 400) {
		ctx.created = true;
		const created = JSON.parse(result.body);
		ctx.uid = created.uid;
		ctx.slug = created.slug;
	}
});

Given('I have created a facility through the API', async ({ page }) => {
	const result = await createFacility(page);
	expect(result.status, `creating the facility failed: ${result.body}`).toBeLessThan(400);
	ctx.created = true;
	const created = JSON.parse(result.body);
	ctx.uid = created.uid;
	ctx.slug = created.slug;
	await clearApiCache();
});

Then('the facility is created', async ({}) => {
	expect(ctx.status, `expected creation to succeed, got ${ctx.status}: ${ctx.body}`).toBeLessThan(
		400
	);
	expect(ctx.uid, 'the created facility has no uid').toBeTruthy();
});

/**
 * Creation records the author as owner and creator of the facility; that
 * connection — not their rank — is what lets them edit it afterwards.
 */
Then('I am recorded among the people answerable for that facility', async ({}) => {
	const out = await djangoShell(`
from neomodel import db
rows, _ = db.cypher_query("""
MATCH (f:Facility {uid: $uid})-[:OWNED_BY|CREATED_BY]->(u:User)-[:HAS_ACCOUNT]->(a:Account)
RETURN a.sub
""", {"uid": "${ctx.uid}"})
print("SUBS", [r[0] for r in rows])
`);
	expect(out, `no owner or creator recorded: ${out}`).toContain('e2e-sub-staff');
});

// "I open the facility page for that facility" and "I see the ... button under
// the edit facility button" live in facility-place-image.steps.ts, which both
// features share — playwright-bdd rejects duplicate definitions.

Then('I see the edit facility button', async ({ page }) => {
	// Idempotent, so this is safe after a scenario that already pressed the
	// pencil as well as one arriving straight from the facility page.
	await enterEditMode(page);
	await expect(editFacilityButton(page)).toBeVisible({ timeout: 20_000 });
});

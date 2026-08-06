import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';
import { djangoShell, clearApiCache, SEED_TAG } from './seed';
import { facilityCtx } from './facilityContext';
import { apiOrigin } from '../tests/fixtures/session';

const { Given, When, Then, After } = createBdd(test);

/** Backend of the site under test, read from PUBLIC_ORIGIN in .env. */
const API_ORIGIN = apiOrigin();

/** Shared, so facility steps defined in the other features agree on the target. */
const ctx: typeof facilityCtx & { seededFacility?: boolean } = facilityCtx;

/**
 * Creates a facility of our own rather than deleting one of the site's: these
 * scenarios delete for real, and a successful run must not cost the dataset an
 * address. Tagged so teardown can find it whatever the scenario did.
 */
async function seedFacility(options: { entries: 'none' | 'active' | 'deactivated' }) {
	const out = await djangoShell(`
from neomodel import db

rows, _ = db.cypher_query("""
CREATE (f:Facility {uid: randomUUID(), name: 'e2e deletion facility',
                    slug: 'e2e-deletion-facility', ${SEED_TAG}: true})
RETURN f.uid
""")
facility_uid = rows[0][0]

kind = "${options.entries}"
if kind != "none":
    db.cypher_query("""
    MATCH (f:Facility {uid: $facility})
    CREATE (e:Entry {uid: randomUUID(), slug: 'e2e-deletion-entry',
                     active: $active, ${SEED_TAG}: true})
    CREATE (e)-[:HAS_FACILITY]->(f)
    """, {"facility": facility_uid, "active": kind == "active"})

print("FACILITY_SEEDED", facility_uid)
`);
	const match = out.match(/FACILITY_SEEDED (\S+)/);
	if (!match) throw new Error(`seeding facility failed: ${out}`);
	await clearApiCache();
	return match[1];
}

After(async () => {
	if (ctx.seededFacility) {
		ctx.seededFacility = false;
		await djangoShell(`
from neomodel import db
db.cypher_query("MATCH (n) WHERE n.${SEED_TAG} = true DETACH DELETE n")
print("CLEANED")
`);
		await clearApiCache();
	}
	ctx.uid = undefined;
	ctx.status = undefined;
	ctx.body = undefined;
});

Given('a facility of this site has an entry', async ({}) => {
	ctx.uid = await seedFacility({ entries: 'active' });
	ctx.seededFacility = true;
});

Given('a facility of this site has a deactivated entry', async ({}) => {
	ctx.uid = await seedFacility({ entries: 'deactivated' });
	ctx.seededFacility = true;
});

Given('this site has a facility with no entry', async ({}) => {
	ctx.uid = await seedFacility({ entries: 'none' });
	ctx.seededFacility = true;
});

/**
 * Deleting the entry outright is the only thing that frees the address, which
 * is exactly what the surrounding scenario is there to show.
 */
Given('that entry is deleted', async ({}) => {
	await djangoShell(`
from neomodel import db
db.cypher_query("""
MATCH (e:Entry)-[:HAS_FACILITY]->(f:Facility {uid: $facility})
DETACH DELETE e
""", {"facility": "${ctx.uid}"})
print("ENTRY_DELETED")
`);
	await clearApiCache();
});

async function deleteFacility(page: import('@playwright/test').Page, uid: string) {
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	return page.evaluate(async (facilityUid) => {
		const response = await fetch(`/api/v2/facilities/${facilityUid}`, { method: 'DELETE' });
		return { status: response.status, body: await response.text() };
	}, uid);
}

When('I delete that facility through the API', async ({ page }) => {
	const result = await deleteFacility(page, ctx.uid!);
	ctx.status = result.status;
	ctx.body = result.body;
});

When('I delete a facility of this site through the API', async ({ page }) => {
	const response = await fetch(`${API_ORIGIN}/api/v2/public/facilities`, {
		headers: { Accept: 'application/json' }
	});
	const facilities = (await response.json()) as { uid: string }[];
	expect(facilities.length, 'this site has no facility').toBeGreaterThan(0);
	ctx.uid = facilities[0].uid;

	const result = await deleteFacility(page, ctx.uid);
	ctx.status = result.status;
	ctx.body = result.body;
});

Then('the deletion is refused because the facility is still in use', async ({}) => {
	expect(ctx.status, `expected 409, got ${ctx.status}: ${ctx.body}`).toBe(409);
	expect(ctx.body ?? '').toMatch(/still used by/i);
});

Then('the refusal says how many entries still use the facility', async ({}) => {
	expect(ctx.body ?? '').toMatch(/\d+ entr(y|ies)/i);
});

Then('the deletion is accepted', async ({}) => {
	expect(ctx.status, `expected the deletion to succeed, got ${ctx.status}: ${ctx.body}`).toBe(200);
});

/** Read from the graph, not the API: the payload is cached and site-scoped. */
async function facilityExists(uid: string): Promise<boolean> {
	const out = await djangoShell(`
from neomodel import db
rows, _ = db.cypher_query("MATCH (f:Facility {uid: $uid}) RETURN count(f)", {"uid": "${uid}"})
print("COUNT", rows[0][0])
`);
	const match = out.match(/COUNT (\d+)/);
	expect(match, `could not count facility ${uid}: ${out}`).toBeTruthy();
	return Number(match![1]) > 0;
}

Then('the facility is still there', async ({}) => {
	expect(await facilityExists(ctx.uid!), 'the facility was deleted after all').toBe(true);
});

Then('the facility is gone', async ({}) => {
	expect(await facilityExists(ctx.uid!), 'the facility is still in the graph').toBe(false);
	ctx.seededFacility = false;
});

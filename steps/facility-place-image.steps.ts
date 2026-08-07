import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';
import { djangoShell, clearApiCache, SEED_TAG } from './seed';
import { addSessionCookie } from './common.steps';
import { facilityCtx, enterEditMode } from './facilityContext';
import { apiOrigin, type TestRole } from '../tests/fixtures/session';

const { Given, When, Then, After } = createBdd(test);

/** Backend of the site under test, read from PUBLIC_ORIGIN in .env. */
const API_ORIGIN = apiOrigin();

/**
 * The Django Site this checkout is configured against — the host of the same
 * origin, so switching context with scripts/dev.sh moves both together.
 */
const SITE_DOMAIN = process.env.SEED_SITE_DOMAIN ?? new URL(API_ORIGIN).hostname;

const addPictureButton = (page: import('@playwright/test').Page) =>
	page.getByRole('button', { name: /photo du lieu/i }).first();
const editFacilityButton = (page: import('@playwright/test').Page) =>
	page.getByRole('button', { name: /Modifier l'établissement/i }).first();
const openDialog = (page: import('@playwright/test').Page) => page.locator('dialog[open]');


/** Per-scenario state. */
/**
 * uid/slug/status/body live in facilityContext so that steps shared with other
 * facility features agree on which facility "that facility" refers to.
 */
const ctx: typeof facilityCtx & {
	seeded?: boolean;
	/** Set when a scenario made the staff test user own an entry, so it can be undone. */
	ownershipLinked?: boolean;
	/** Set when a scenario made the staff test user creator of the facility. */
	creatorLinked?: boolean;
	/**
	 * Set when aFacility() seeded the facility ctx.uid points to, so After
	 * knows it is this file's own throwaway facility to delete — not one
	 * ctx.uid inherited from another feature's step, which facilityCtx is
	 * deliberately shared with.
	 */
	seededFacility?: boolean;
} = facilityCtx;

/**
 * A 16:9 JPEG built in the browser, since these scenarios care about the shape
 * of the picture and never about what it depicts.
 */
async function makeImage(
	page: import('@playwright/test').Page,
	width: number,
	height: number
): Promise<string> {
	return page.evaluate(
		([w, h]) => {
			const canvas = document.createElement('canvas');
			canvas.width = w;
			canvas.height = h;
			const context = canvas.getContext('2d')!;
			context.fillStyle = '#b4b4b4';
			context.fillRect(0, 0, w, h);
			return canvas.toDataURL('image/jpeg', 0.85);
		},
		[width, height]
	);
}

/**
 * Creates a facility of our own rather than picking one of the site's: these
 * scenarios make the staff test user its owner and give it a picture, and
 * under parallel workers a facility borrowed from the real, shared dataset
 * gets fought over — one worker's teardown (After, below) revokes ownership
 * or removes the picture out from under a sibling worker still mid-scenario.
 * Tagged with the worker-scoped SEED_TAG so cleanup only ever touches this
 * worker's own facility. Mirrors seedFacility in facility-deletion.steps.ts.
 */
async function aFacility() {
	// Once a scenario has settled on a facility — typically by making the signed
	// in user answerable for it — every later step must stay with that one.
	// Picking afresh would land on a facility the user is a stranger to, and the
	// scenario would fail on the wrong thing.
	if (ctx.uid && ctx.slug) {
		return { uid: ctx.uid, slug: ctx.slug };
	}

	// randomUUID() gives the facility and entry unique identity on its own;
	// this suffix only keeps the human-readable slug from colliding too.
	const worker = process.env.TEST_PARALLEL_INDEX ?? '0';

	const out = await djangoShell(`
from neomodel import db
from directory.models.core import Directory
from django.contrib.sites.models import Site

site = Site.objects.get(domain=${JSON.stringify(SITE_DOMAIN)})
directory = Directory.objects.filter(site=site).first()
assert directory, "no directory for site"

# public/facilities (api/routers/public_facilities.py) requires the full chain
# (Directory)-[:HAS_ENTRY]->(Entry)-[:HAS_EFFECTOR]->(Effector), plus
# (Entry)-[:HAS_FACILITY]->(Facility)-[:LOCATED_IN_THE_ADMINISTRATIVE_TERRITORIAL_ENTITY*]->(Country)
# and Entry.active = true — a facility that only exists as a bare node with an
# entry pointing at it, as an earlier version of this seed did, 404s from that
# endpoint even though it exists via the plain /facilities/{uid} lookup.
rows, _ = db.cypher_query("""
MATCH (f:Facility)-[:LOCATED_IN_THE_ADMINISTRATIVE_TERRITORIAL_ENTITY]->(:Commune)-[:LOCATED_IN_THE_ADMINISTRATIVE_TERRITORIAL_ENTITY*]->(:Country)
RETURN f.uid LIMIT 1
""")
assert rows, "no facility with a full geography chain to model the seeded one on"
model_uid = rows[0][0]

rows, _ = db.cypher_query("""
MATCH (e:Effector) RETURN e.uid LIMIT 1
""")
assert rows, "no effector to attach the seeded entry to"
effector_uid = rows[0][0]

rows, _ = db.cypher_query("""
MATCH (model:Facility {uid: $model})-[:LOCATED_IN_THE_ADMINISTRATIVE_TERRITORIAL_ENTITY]->(commune:Commune)
CREATE (f:Facility {uid: randomUUID(), name: 'e2e place image facility',
                    slug: $facilitySlug, location: model.location, ${SEED_TAG}: true})
MERGE (f)-[:LOCATED_IN_THE_ADMINISTRATIVE_TERRITORIAL_ENTITY]->(commune)
RETURN f.uid, f.slug
""", {"model": model_uid, "facilitySlug": "e2e-place-image-facility-${worker}"})
facility_uid, facility_slug = rows[0]

db.cypher_query("""
MATCH (d:Directory {name: $dir})
MATCH (f:Facility {uid: $facility})
MATCH (ef:Effector {uid: $effector})
CREATE (e:Entry {uid: randomUUID(), slug: $entrySlug, active: true, ${SEED_TAG}: true})
CREATE (e)-[:HAS_FACILITY]->(f)
CREATE (e)-[:HAS_EFFECTOR]->(ef)
MERGE (d)-[:HAS_ENTRY]->(e)
""", {"dir": directory.name, "facility": facility_uid, "effector": effector_uid,
      "entrySlug": "e2e-place-image-entry-${worker}"})

print("FACILITY_SEEDED", facility_uid, facility_slug)
`);
	const match = out.match(/FACILITY_SEEDED (\S+) (\S+)/);
	if (!match) throw new Error(`seeding facility failed: ${out}`);
	await clearApiCache();
	ctx.seededFacility = true;
	return { uid: match[1], slug: match[2] };
}

/**
 * Gives a facility a place picture straight through the model, so scenarios
 * that need one to exist do not depend on the upload path working.
 */
/**
 * `alt` defaults to a description, but can be seeded empty: every picture moved
 * over from the old storage arrived without one, and that is the state the
 * description scenarios start from.
 */
async function seedPlaceImage(uid: string, alt = 'e2eSeed place picture') {
	const out = await djangoShell(`
import io
from PIL import Image
from django.core.files.base import ContentFile
from facility.models import PlaceImage

buffer = io.BytesIO()
Image.new("RGB", (1600, 900), (180, 180, 180)).save(buffer, format="JPEG")

place, _ = PlaceImage.objects.get_or_create(neomodel_uid="${uid}")
place.alt = ${JSON.stringify(alt)}
place.image.save("e2eSeed-${uid}.jpg", ContentFile(buffer.getvalue()), save=True)
print("PLACE_IMAGE_SEEDED")
`);
	if (!out.includes('PLACE_IMAGE_SEEDED')) throw new Error(`seeding place image failed: ${out}`);
	await clearApiCache();
}

async function removePlaceImage(uid: string) {
	await djangoShell(`
from facility.models import PlaceImage
for p in PlaceImage.objects.filter(neomodel_uid="${uid}"):
    if p.image:
        p.image.delete(save=False)
    p.delete()
print("PLACE_IMAGE_REMOVED")
`);
	await clearApiCache();
}

/** These scenarios add a picture to a real facility, so take it away again. */
After(async () => {
	if (ctx.seeded && ctx.uid) {
		const uid = ctx.uid;
		ctx.seeded = false;
		await removePlaceImage(uid);
	}
	// Leaving the staff user owning an entry would make the scenarios that
	// expect an unconnected staff member pass without proving anything.
	if (ctx.ownershipLinked && ctx.uid) {
		const uid = ctx.uid;
		ctx.ownershipLinked = false;
		await djangoShell(`
from neomodel import db
db.cypher_query("""
MATCH (e:Entry)-[:HAS_FACILITY]->(f:Facility {uid: $facility})
MATCH (e)-[r:OWNED_BY]->(u:User {sub: "e2e-sub-staff"})
DELETE r
""", {"facility": "${uid}"})
print("OWNERSHIP_RESTORED")
`);
		await clearApiCache();
	}
	if (ctx.creatorLinked && ctx.uid) {
		const uid = ctx.uid;
		ctx.creatorLinked = false;
		await djangoShell(`
from neomodel import db
db.cypher_query("""
MATCH (f:Facility {uid: $facility})-[r:CREATED_BY]->(u:User {sub: "e2e-sub-staff"})
DELETE r
""", {"facility": "${uid}"})
print("CREATOR_RESTORED")
`);
		await clearApiCache();
	}
	// The facility itself was ours, not one borrowed from the real dataset:
	// delete it outright rather than trying to undo individual relationships.
	if (ctx.seededFacility && ctx.uid) {
		const uid = ctx.uid;
		ctx.seededFacility = false;
		await djangoShell(`
from neomodel import db
db.cypher_query("""
MATCH (f:Facility {uid: $facility})
OPTIONAL MATCH (f)<-[:HAS_FACILITY]-(e:Entry)
DETACH DELETE f, e
""", {"facility": "${uid}"})
print("SEEDED_FACILITY_REMOVED")
`);
		await clearApiCache();
	}
	ctx.uid = undefined;
	ctx.slug = undefined;
	ctx.status = undefined;
	ctx.body = undefined;
});

// --- Opening a facility page -------------------------------------------------

Given('I open the facility page for a facility of this site', async ({ page }) => {
	const facility = await aFacility();
	ctx.uid = facility.uid;
	ctx.slug = facility.slug;
	await page.goto(`/sites/${facility.slug}`, { waitUntil: 'networkidle' });
});

Given('the facility of this site has a place picture', async ({}) => {
	const facility = await aFacility();
	ctx.uid = facility.uid;
	ctx.slug = facility.slug;
	await seedPlaceImage(facility.uid);
	ctx.seeded = true;
});

When('I open the facility page for that facility', async ({ page }) => {
	await page.goto(`/sites/${ctx.slug}`, { waitUntil: 'networkidle' });
});

// --- The button --------------------------------------------------------------

Then('I see the {string} button under the edit facility button', async ({ page }, label: string) => {
	expect(label).toBe('add picture');
	await enterEditMode(page);
	const edit = editFacilityButton(page);
	const add = addPictureButton(page);
	await expect(edit).toBeVisible({ timeout: 15_000 });
	await expect(add).toBeVisible({ timeout: 15_000 });

	// "Under" is the point of the placement, so assert the geometry rather than
	// merely that both buttons exist somewhere on the page.
	const editBox = await edit.boundingBox();
	const addBox = await add.boundingBox();
	expect(editBox, 'edit button has no box').toBeTruthy();
	expect(addBox, 'add picture button has no box').toBeTruthy();
	expect(addBox!.y).toBeGreaterThan(editBox!.y);
});

Then('I do not see the {string} button', async ({ page }, label: string) => {
	expect(label).toBe('add picture');
	await expect(addPictureButton(page)).toHaveCount(0);
});

Then('I do not see the edit facility button', async ({ page }) => {
	await expect(editFacilityButton(page)).toHaveCount(0);
});

Then('the button offers to modify the picture rather than add one', async ({ page }) => {
	await enterEditMode(page);
	await expect(page.getByRole('button', { name: /Modifier la photo du lieu/i }).first()).toBeVisible(
		{ timeout: 15_000 }
	);
	await expect(page.getByRole('button', { name: /Ajouter une photo du lieu/i })).toHaveCount(0);
});

// --- The dialog --------------------------------------------------------------

When('I open the place picture dialog', async ({ page }) => {
	await enterEditMode(page);
	await addPictureButton(page).click();
	await expect(openDialog(page)).toBeVisible({ timeout: 10_000 });
});

Then('the dialog explains what to photograph', async ({ page }) => {
	await expect(openDialog(page).getByText(/bâtiment|entrée/i).first()).toBeVisible();
});

Then('the dialog offers a description field for the image', async ({ page }) => {
	await expect(
		openDialog(page).getByText(/Description de l'image/i).first()
	).toBeVisible();
});

/**
 * The access selector belongs to avatars. Located by the avatar's own label so
 * the assertion fails if that control is ever reused here by accident.
 */
Then('the dialog does not offer an access level', async ({ page }) => {
	await expect(openDialog(page).locator('select[name="avatar-access"]')).toHaveCount(0);
	await expect(openDialog(page).getByText(/Qui peut voir cette photo/i)).toHaveCount(0);
});

When('I choose an image file', async ({ page }) => {
	const dataUrl = await makeImage(page, 2000, 1500);
	const buffer = Buffer.from(dataUrl.split(',')[1], 'base64');
	await openDialog(page)
		.locator('input[type="file"]')
		.setInputFiles({ name: 'place.jpg', mimeType: 'image/jpeg', buffer });
});

Then('the crop selection has a 16:9 ratio', async ({ page }) => {
	const selection = openDialog(page).locator('cropper-selection');
	await expect(selection).toHaveCount(1, { timeout: 15_000 });
	const ratio = await selection.getAttribute('aspect-ratio');
	expect(Number(ratio)).toBeCloseTo(16 / 9, 3);
});

// --- The API -----------------------------------------------------------------

const SHAPES: Record<string, [number, number]> = {
	square: [1000, 1000],
	portrait: [900, 1600],
	wide: [1600, 900]
};

async function uploadThroughApi(
	page: import('@playwright/test').Page,
	uid: string,
	width: number,
	height: number
) {
	const dataUrl = await makeImage(page, width, height);
	return page.evaluate(
		async ([facilityUid, url]) => {
			const blob = await (await fetch(url)).blob();
			const form = new FormData();
			form.append('file', blob, 'place.jpg');
			form.append('alt', 'e2e');
			const response = await fetch(`/api/facility/${facilityUid}/image`, {
				method: 'PUT',
				body: form
			});
			return { status: response.status, body: await response.text() };
		},
		[uid, dataUrl] as const
	);
}

When('I upload a facility picture through the API', async ({ page }) => {
	const facility = await aFacility();
	ctx.uid = facility.uid;
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	const result = await uploadThroughApi(page, facility.uid, 1600, 900);
	ctx.status = result.status;
});

When('I upload a {string} facility picture through the API', async ({ page }, shape: string) => {
	const facility = await aFacility();
	ctx.uid = facility.uid;
	const [width, height] = SHAPES[shape];
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	const result = await uploadThroughApi(page, facility.uid, width, height);
	ctx.status = result.status;
	ctx.body = result.body;
});

When('I upload a facility picture measuring {int}x{int}', async ({ page }, w: number, h: number) => {
	const facility = await aFacility();
	ctx.uid = facility.uid;
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	const result = await uploadThroughApi(page, facility.uid, w, h);
	ctx.status = result.status;
	ctx.body = result.body;
});

/**
 * Makes the staff test user the owner of an entry at a facility, so the
 * object-level check in authorize_api recognizes them.
 *
 * What grants the picture is this connection, not the staff role: another
 * staff member of the same organisation must still be turned away.
 */
Given(
	'I am signed in as the owner of an entry at a facility of this site',
	async ({ context, page, baseURL }) => {
		const facility = await aFacility();
		ctx.uid = facility.uid;
		ctx.slug = facility.slug;

		// Plain Cypher rather than the neomodel class: inside `manage.py shell`
		// neomodel resolves a relationship's node class against the calling
		// module, which is the shell command itself, and raises AttributeError.
		const out = await djangoShell(`
from neomodel import db

rows, _ = db.cypher_query("""
MATCH (e:Entry)-[:HAS_FACILITY]->(f:Facility {uid: $facility})
WITH e LIMIT 1
MATCH (u:User)-[:HAS_ACCOUNT]->(:Account {sub: "e2e-sub-staff"})
MERGE (e)-[:OWNED_BY]->(u)
RETURN e.uid
""", {"facility": "${facility.uid}"})
assert rows, "no entry at this facility, or no staff test user"
print("OWNER_LINKED", rows[0][0])
`);
		if (!out.includes('OWNER_LINKED')) throw new Error(`could not link owner: ${out}`);
		ctx.ownershipLinked = true;
		await clearApiCache();

		await addSessionCookie(context, 'staff', baseURL ?? 'http://localhost:3000');
		await page.goto('/', { waitUntil: 'domcontentloaded' });
	}
);

/**
 * Records the staff test user as creator of the facility node itself.
 *
 * Distinct from owning an entry at it: someone who added the address to the
 * directory answers for it even before anyone practises there. This is the path
 * get_facility_users reaches through facility.creator rather than through the
 * entries, so it needs its own scenario.
 */
Given(
	'I am signed in as the creator of a facility of this site',
	async ({ context, page, baseURL }) => {
		const facility = await aFacility();
		ctx.uid = facility.uid;
		ctx.slug = facility.slug;

		const out = await djangoShell(`
from neomodel import db

rows, _ = db.cypher_query("""
MATCH (f:Facility {uid: $facility})
MATCH (u:User)-[:HAS_ACCOUNT]->(:Account {sub: "e2e-sub-staff"})
MERGE (f)-[:CREATED_BY]->(u)
RETURN f.uid
""", {"facility": "${facility.uid}"})
assert rows, "no such facility, or no staff test user"
print("CREATOR_LINKED", rows[0][0])
`);
		if (!out.includes('CREATOR_LINKED')) throw new Error(`could not link creator: ${out}`);
		ctx.creatorLinked = true;
		await clearApiCache();

		await addSessionCookie(context, 'staff', baseURL ?? 'http://localhost:3000');
		await page.goto('/', { waitUntil: 'domcontentloaded' });
	}
);

/**
 * Signs in as staff while making sure they own no entry at the facility —
 * belonging to the organisation must not by itself grant the picture.
 */
Given(
	'I am signed in as a staff member with no entry at a facility of this site',
	async ({ context, page, baseURL }) => {
		const facility = await aFacility();
		ctx.uid = facility.uid;
		ctx.slug = facility.slug;

		// Detach the staff user from this facility only — through its entries and
		// on the facility itself — so the scenario really does describe someone
		// unconnected to it.
		//
		// Deliberately not every link the user holds anywhere: other scenarios
		// grant themselves ownership of other facilities, and clearing those
		// mid-suite would break them. Leftovers from an interrupted run are
		// handled once, before the suite starts (tests/globalSetup.ts).
		await djangoShell(`
from neomodel import db
res, _ = db.cypher_query("""
MATCH (f:Facility {uid: $facility})
OPTIONAL MATCH (e:Entry)-[:HAS_FACILITY]->(f)
WITH collect(e) + collect(f) AS nodes
UNWIND nodes AS n
MATCH (n)-[r:OWNED_BY|CREATED_BY]->(:User)-[:HAS_ACCOUNT]->(:Account {sub: "e2e-sub-staff"})
DELETE r
RETURN count(r)
""", {"facility": "${facility.uid}"})
print("OWNERSHIP_CLEARED", res)
`);
		await clearApiCache();

		await addSessionCookie(context, 'staff', baseURL ?? 'http://localhost:3000');
		await page.goto('/', { waitUntil: 'domcontentloaded' });
	}
);

/**
 * Signs in, or clears the session for "signed out", so one outline can cover
 * everyone the permission rule turns away.
 */
Given('I am signed in as {string}', async ({ context, page, baseURL }, who: string) => {
	if (who === 'signed out') {
		await context.clearCookies();
		return;
	}
	await addSessionCookie(context, who as TestRole, baseURL ?? 'http://localhost:3000');
	await page.goto('/', { waitUntil: 'domcontentloaded' });
});

/**
 * A picture whose description is empty — the state every migrated picture
 * arrived in, since the old storage had no equivalent field.
 */
Given('the facility of this site has a place picture without a description', async ({}) => {
	const facility = await aFacility();
	ctx.uid = facility.uid;
	ctx.slug = facility.slug;
	await seedPlaceImage(facility.uid, '');
	ctx.seeded = true;
});

const DESCRIPTION = 'La façade du cabinet, vue depuis la rue';

When('I write a description for the picture', async ({ page }) => {
	const dialog = openDialog(page);
	const field = dialog.getByLabel(/Description de l'image/i);
	await field.fill(DESCRIPTION);
});

/** The control that commits the change, whatever it ends up being called. */
const saveButton = (page: import('@playwright/test').Page) =>
	openDialog(page).getByRole('button', { name: /Valider|Envoyer|Enregistrer/i }).first();

Then('the dialog offers to save the change', async ({ page }) => {
	const button = saveButton(page);
	await expect(button, 'no way to save the new description').toBeVisible({ timeout: 10_000 });
	await expect(button, 'the save button is disabled despite the change').toBeEnabled();
});

/** Nothing has changed, so committing must not be on offer. */
Then('the dialog does not offer to save anything', async ({ page }) => {
	const button = saveButton(page);
	if (await button.count()) {
		await expect(button, 'an untouched dialog offers to save').toBeDisabled();
	}
});

When('I save the change', async ({ page }) => {
	await saveButton(page).click();
});

Then('the facility picture carries that description', async ({ page }) => {
	// Read from the API rather than the dialog: what matters is that the
	// description was stored, not that the form echoed it back.
	await expect
		.poll(
			async () => {
				const response = await fetch(`${API_ORIGIN}/api/v2/public/facilities`, {
					headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' }
				});
				const facilities = (await response.json()) as { uid: string; image?: { alt?: string } }[];
				return facilities.find((f) => f.uid === ctx.uid)?.image?.alt ?? '';
			},
			{ timeout: 20_000, message: 'the description never reached the facility' }
		)
		.toBe(DESCRIPTION);
});

/**
 * Asks the backend the same question the page asks before offering the editing
 * controls — the server load in sites/[slug]/+page.server.ts calls this very
 * endpoint.
 *
 * Run through the browser so the session cookie is sent exactly as it would be
 * for a real visitor. Root-relative, so nginx routes it to the backend on
 * whichever worker host this scenario is browsing.
 */
async function askCanEdit(page: import('@playwright/test').Page, uid: string) {
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	return page.evaluate(async (facilityUid) => {
		const response = await fetch(`/api/v2/facilities/${facilityUid}/can-edit`, {
			headers: { Accept: 'application/json' }
		});
		if (!response.ok) return { can_edit: false };
		return (await response.json()) as { can_edit?: boolean };
	}, uid);
}

Then('the page is told I may not edit that facility', async ({ page }) => {
	const answer = await askCanEdit(page, ctx.uid!);
	expect(answer.can_edit, 'the page was told an unconnected staff member may edit').toBe(false);
});

Then('the page is told I may edit that facility', async ({ page }) => {
	const answer = await askCanEdit(page, ctx.uid!);
	expect(answer.can_edit, 'the page was told someone connected may not edit').toBe(true);
});

Then('the request is refused', async ({}) => {
	expect(ctx.status, `expected a refusal, got ${ctx.status}`).toBeGreaterThanOrEqual(400);
});

Then('the upload is accepted', async ({}) => {
	expect(ctx.status, `expected the upload to succeed, got ${ctx.status}`).toBe(200);
	ctx.seeded = true;
});

Then('the upload is refused because the shape is wrong', async ({}) => {
	expect(ctx.status).toBe(400);
	expect(ctx.body ?? '').toMatch(/16:9/);
});

Then('the upload is refused because the image is too small', async ({}) => {
	expect(ctx.status).toBe(400);
	expect(ctx.body ?? '').toMatch(/at least|pixels/i);
});

When('I read that facility from the API', async ({}) => {
	const response = await fetch(`${API_ORIGIN}/api/v2/public/facilities`, {
		headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' }
	});
	const facilities = (await response.json()) as { uid: string; image?: any; avatar?: any }[];
	ctx.body = facilities.find((f) => f.uid === ctx.uid);
	expect(ctx.body, `facility ${ctx.uid} not in the payload`).toBeTruthy();
});

Then('the facility carries a place image', async ({}) => {
	expect(ctx.body.image, 'no image on the facility').toBeTruthy();
	expect(ctx.body.image.raw, 'place image has no raw URL').toBeTruthy();
});

/**
 * The two keys mean different things: `avatar` is the square picture read from
 * Contact, `image` the wide photograph of the place.
 */
Then('the place image is separate from the avatar', async ({}) => {
	expect(ctx.body).toHaveProperty('avatar');
	expect(ctx.body).toHaveProperty('image');
	expect(ctx.body.image.raw).not.toBe(ctx.body.avatar?.raw ?? null);
});

When('I delete the facility picture through the API', async ({ page }) => {
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	const result = await page.evaluate(async (uid) => {
		const response = await fetch(`/api/facility/${uid}/image`, { method: 'DELETE' });
		return { status: response.status };
	}, ctx.uid!);
	ctx.status = result.status;
	await clearApiCache();
});

Then('the facility carries no place image', async ({}) => {
	const response = await fetch(`${API_ORIGIN}/api/v2/public/facilities`, {
		headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' }
	});
	const facilities = (await response.json()) as { uid: string; image?: unknown }[];
	const facility = facilities.find((f) => f.uid === ctx.uid);
	expect(facility?.image ?? null).toBeNull();
	ctx.seeded = false;
});

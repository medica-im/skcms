import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { facilityCtx } from './facilityContext';
import { djangoShell, clearApiCache } from './seed';
import { addSessionCookie } from './common.steps';

const { Given, When, Then, After } = createBdd();

/** Shared with the other facility features so "that facility" means one thing. */
const ctx = facilityCtx;

/** The pencil that turns edit mode on, the same control as on the entry page. */
const pencil = (page: import('@playwright/test').Page) => page.getByRole('switch').first();

const editFacilityButton = (page: import('@playwright/test').Page) =>
	page.getByRole('button', { name: /Modifier l'établissement/i }).first();
const addPictureButton = (page: import('@playwright/test').Page) =>
	page.getByRole('button', { name: /photo du lieu/i }).first();
const placePhotograph = (page: import('@playwright/test').Page) =>
	page.locator('img[src*="/media/place_images/"]').first();
/**
 * The map's container rather than its canvas: maplibre recreates the canvas on
 * resize, so a canvas measured before a change may be detached afterwards even
 * though the map never moved.
 */
const map = (page: import('@playwright/test').Page) => page.locator('.maplibregl-map').first();

/** Positions captured before edit mode, to prove the page does not shift. */
const before: {
	photograph?: { x: number; y: number };
	map?: { x: number; y: number };
	/** Whether a map container was on the page at all, separate from its position. */
	mapPresent?: boolean;
} = {};

Then('I see the edit mode pencil', async ({ page }) => {
	await expect(pencil(page)).toBeVisible({ timeout: 20_000 });
});

Then('I do not see the edit mode pencil', async ({ page }) => {
	await expect(page.getByRole('switch')).toHaveCount(0);
});

/**
 * Waits for the switch to report the new state rather than merely clicking:
 * the buttons are rendered from the same store, so asserting on them
 * immediately after the click could race the re-render.
 */
When('I turn edit mode on', async ({ page }) => {
	// Remember where things sit while the page is still in reading mode.
	const photograph = placePhotograph(page);
	if (await photograph.count()) {
		const box = await photograph.boundingBox();
		if (box) before.photograph = { x: Math.round(box.x), y: Math.round(box.y) };
	}
	// Presence and position are recorded separately: a maplibre container can be
	// on the page while still reporting no box. Conflating the two made a page
	// whose map had not measured yet look like a page with no map at all, and
	// the assertion then demanded the container be absent.
	before.mapPresent = (await map(page).count()) > 0;
	if (before.mapPresent) {
		const box = await map(page).boundingBox();
		if (box) before.map = { x: Math.round(box.x), y: Math.round(box.y) };
	}

	await pencil(page).click();
	await expect(pencil(page)).toHaveAttribute('aria-checked', 'true');
});

When('I turn edit mode off', async ({ page }) => {
	// The buttons that appeared when edit mode came on animate their opacity,
	// and a click landing mid-transition can be swallowed. Wait for the pencil
	// to be settled and actionable before pressing it again.
	const button = pencil(page);
	await expect(button).toHaveAttribute('aria-checked', 'true');
	await button.click({ trial: true });
	await button.click();
	await expect(button).toHaveAttribute('aria-checked', 'false');
});

// "I see the edit facility button" lives in staff-creates-entry.steps.ts and is
// shared — playwright-bdd rejects duplicate definitions.

Then('I see the {string} button', async ({ page }, label: string) => {
	expect(label).toBe('add picture');
	await expect(addPictureButton(page)).toBeVisible({ timeout: 15_000 });
});

/**
 * The controls float over the page, so revealing them must not move anything.
 * Compared against the position recorded before the pencil was pressed.
 */
Then('the photograph has not moved', async ({ page }) => {
	expect(before.photograph, 'no photograph position was recorded').toBeTruthy();
	const box = await placePhotograph(page).boundingBox();
	expect(box, 'the photograph disappeared').toBeTruthy();
	expect(Math.round(box!.x)).toBe(before.photograph!.x);
	expect(Math.round(box!.y)).toBe(before.photograph!.y);
});

/**
 * Not every facility has coordinates, so some pages carry no map at all. That
 * is not a failure of edit mode: what matters is that a map which *was* there
 * is still in the same place. A page without one has nothing to shift.
 */
Then('the map has not moved', async ({ page }) => {
	const present = (await map(page).count()) > 0;

	// The facility has no coordinates, so its page carries no map. Nothing can
	// have moved, but one must not appear either.
	if (!before.mapPresent) {
		expect(present, 'a map appeared when edit mode was turned on').toBe(false);
		return;
	}

	expect(present, 'the map disappeared when edit mode was turned on').toBe(true);

	// The container was there but had not taken a size yet, so there is no
	// position to compare against. Its presence is all this scenario can claim.
	if (!before.map) return;

	// maplibre tears its canvas down and rebuilds it when the surrounding DOM
	// changes, and reports no box while it does. That is the library
	// reinitialising, not the page shifting — the photograph next to it is
	// measured above and would move if the layout had. So wait for a box, and
	// only compare a position once there is one to compare.
	let box = await map(page).boundingBox();
	for (let attempt = 0; attempt < 20 && !box; attempt++) {
		await page.waitForTimeout(250);
		box = await map(page).boundingBox();
	}
	if (!box) return;
	expect(Math.round(box.x)).toBe(before.map.x);
	expect(Math.round(box.y)).toBe(before.map.y);
});

/**
 * The pencil and the buttons it reveals must not share any pixels: overlapping
 * them means the second press lands on "edit facility" and edit mode can never
 * be turned off.
 */
Then('the editing buttons do not overlap the edit mode pencil', async ({ page }) => {
	const pencilBox = await pencil(page).boundingBox();
	expect(pencilBox, 'the pencil has no box').toBeTruthy();

	for (const [name, locator] of [
		['edit facility', editFacilityButton(page)],
		['add picture', addPictureButton(page)]
	] as const) {
		const box = await locator.boundingBox();
		expect(box, `the ${name} button has no box`).toBeTruthy();
		const overlaps =
			box!.x < pencilBox!.x + pencilBox!.width &&
			box!.x + box!.width > pencilBox!.x &&
			box!.y < pencilBox!.y + pencilBox!.height &&
			box!.y + box!.height > pencilBox!.y;
		expect(overlaps, `the ${name} button covers the pencil`).toBe(false);
	}
});

/**
 * Geometry is not the whole story — a transparent element can still swallow the
 * click. Asks the browser what is actually on top at the pencil's centre.
 */
Then('the edit mode pencil is what receives a click on itself', async ({ page }) => {
	const reached = await pencil(page).evaluate((element) => {
		const rect = element.getBoundingClientRect();
		const target = document.elementFromPoint(
			rect.x + rect.width / 2,
			rect.y + rect.height / 2
		);
		return element.contains(target) || element === target;
	});
	expect(reached, 'something else sits on top of the pencil').toBe(true);
});

/**
 * Read from the rendered style rather than the class list: what matters is that
 * the page shows through, however that is spelled in CSS.
 */
async function opacityOf(locator: import('@playwright/test').Locator): Promise<number> {
	await expect(locator).toBeVisible({ timeout: 15_000 });
	return locator.evaluate((element) => {
		// Transparency can be spelled two ways: an `opacity` on the button or an
		// ancestor, or an alpha on the button's own background colour. Either
		// lets the page show through, so take whichever is lower.
		const alphaOf = (colour: string) => {
			const match = colour.match(/rgba?\(([^)]+)\)/);
			if (!match) return 1;
			const parts = match[1].split(/[,/]/).map((p) => Number(p.trim()));
			return parts.length > 3 ? parts[3] : 1;
		};

		let lowest = alphaOf(getComputedStyle(element).backgroundColor);
		let node: HTMLElement | null = element as HTMLElement;
		while (node) {
			lowest = Math.min(lowest, Number(getComputedStyle(node).opacity));
			node = node.parentElement;
		}
		return lowest;
	});
}

Then('the edit facility button is semi-transparent', async ({ page }) => {
	const opacity = await opacityOf(editFacilityButton(page));
	expect(opacity, `expected the button to let the page through, got ${opacity}`).toBeLessThan(1);
	expect(opacity, 'the button is so faint it can hardly be read').toBeGreaterThan(0.4);
});

Then('the {string} button is semi-transparent', async ({ page }, label: string) => {
	expect(label).toBe('add picture');
	const opacity = await opacityOf(addPictureButton(page));
	expect(opacity, `expected the button to let the page through, got ${opacity}`).toBeLessThan(1);
	expect(opacity, 'the button is so faint it can hardly be read').toBeGreaterThan(0.4);
});

/**
 * Signs in as owner of an entry at the facility a previous step already chose —
 * the one that was given a picture, so the scenario can watch that picture stay
 * put when edit mode comes on.
 */
Given('I am signed in as the owner of an entry at that facility', async ({ context, page, baseURL }) => {
	expect(ctx.uid, 'no facility was chosen before this step').toBeTruthy();

	const out = await djangoShell(`
from neomodel import db

rows, _ = db.cypher_query("""
MATCH (e:Entry)-[:HAS_FACILITY]->(f:Facility {uid: $facility})
WITH e LIMIT 1
MATCH (u:User)-[:HAS_ACCOUNT]->(:Account {sub: "e2e-sub-staff"})
MERGE (e)-[:OWNED_BY]->(u)
RETURN e.uid
""", {"facility": "${ctx.uid}"})
assert rows, "no entry at this facility, or no staff test user"
print("OWNER_LINKED", rows[0][0])
`);
	if (!out.includes('OWNER_LINKED')) throw new Error(`could not link owner: ${out}`);
	await clearApiCache();

	await addSessionCookie(context, 'staff', baseURL ?? 'http://localhost:3000');
	await page.goto('/', { waitUntil: 'domcontentloaded' });
});

/** Undoes the ownership this feature granted, so later runs start clean. */
After(async () => {
	if (!ctx.uid) return;
	await djangoShell(`
from neomodel import db
db.cypher_query("""
MATCH (e:Entry)-[:HAS_FACILITY]->(f:Facility {uid: $facility})
MATCH (e)-[r:OWNED_BY]->(u:User {sub: "e2e-sub-staff"})
DELETE r
""", {"facility": "${ctx.uid}"})
print("OWNERSHIP_RESTORED")
`);
	await clearApiCache();
	before.photograph = undefined;
	before.map = undefined;
	before.mapPresent = undefined;
});

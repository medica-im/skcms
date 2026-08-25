import { createBdd } from 'playwright-bdd';
import { expect, type Page } from '@playwright/test';
import { test } from './fixtures';

const { Given, When, Then } = createBdd(test);

/**
 * Picking a facility button leaves that facility alone on the map, without
 * moving the camera.
 *
 * The camera assertions read what the map draws rather than the Map object:
 * svelte-maplibre keeps its Map in a component closure, not on the element, so
 * there is nothing to reach for from a step. The scale bar is the readable
 * proxy for zoom, and a marker's position moves with centre and zoom together.
 *
 * The page is backed by a checked-in fixture of the Lyon 3 directory — sixteen
 * crowded facilities — so these run the same against any site serving the app.
 * See _test/map-cluster/+page.server.ts for why it is a fixture and not a fetch.
 */

/** The map a scenario is talking about. */
let mapScope = '#map-current';
/**
 * Where that map's buttons live — NOT always inside the map element.
 *
 * <Facility> renders its buttons and its map together, so #map-current wraps
 * both. The clustered section lays them out as siblings in a grid, so the
 * buttons sit outside #map-clustered entirely and a `${mapScope} a.btn`
 * locator matches nothing there. Keeping the two scopes apart is what lets one
 * set of steps drive both layouts.
 */
let btnScope = '#map-current';

/** Only the facility buttons: the section also renders nav and control links. */
const buttons = () => `${btnScope} a.btn`;

/** Markers the map is currently drawing. */
const markers = () => `${mapScope} .maplibregl-marker`;

/**
 * The picked marker.
 *
 * MapLibreClustered draws the isolated facility with .marker-pin-picked; the
 * older MapLibre.svelte emphasised in place with .marker-emphasised. Both are
 * matched so the steps survive either component being the one under test.
 */
const picked = () => `${mapScope} .marker-pin-picked, ${mapScope} .marker-emphasised`;

/**
 * Where the camera is, keyed by facility so it survives the set changing.
 *
 * `scale` is the zoom, read off the scale bar. `at` maps each drawn facility to
 * its pixel position, which moves only when the centre or zoom does.
 *
 * Keyed rather than joined into one string: picking a facility removes the
 * others, so comparing the whole list would report "the view moved" every time
 * the set changed — which is exactly what the isolate behaviour does on
 * purpose. Comparing only the facilities present on *both* sides asks the
 * question the scenario means: did the camera move under them.
 *
 * Positions are recorded but *not* compared across a change of set, because a
 * marker cannot be identified across one. The pin exposes only `title`, and
 * Lyon 3 holds three facilities called "Cabinet infirmier"; keyed by name, the
 * isolated pin and whichever same-named pin came first in the restored set
 * collided, and the comparison read two different facilities as one and
 * reported a move that never happened. The popup's href would be unique, but it
 * is not in the DOM until the popup opens.
 */
async function camera(page: Page, sel = mapScope) {
	return await page.locator(`${sel} .maplibregl-map`).evaluate((el) => {
		const scale = el.querySelector('.maplibregl-ctrl-scale')?.textContent ?? '';
		const positions = Array.from(el.querySelectorAll('.maplibregl-marker'))
			.map((m) => (m as HTMLElement).style.transform)
			.join('|');
		return { scale, positions };
	});
}

type Camera = { scale: string; positions: string };

/**
 * Whether the camera is where it was.
 *
 * The scale bar is the measure. It reports metres-per-pixel, so it moves the
 * moment the zoom does — which is what "the map jumped" means to a reader, and
 * the regression these scenarios guard.
 *
 * Marker positions are deliberately not part of this when the drawn set differs
 * between the two readings: isolating removes eight of nine markers on purpose,
 * so requiring identical positions would fail every time the feature worked.
 * Where the set *is* unchanged, positions are compared too — a pan at constant
 * zoom leaves the scale bar alone and would otherwise slip through.
 */
function sameView(a: Camera, b: Camera) {
	if (a.scale !== b.scale) return false;
	const sameSet = a.positions.split('|').length === b.positions.split('|').length;
	return sameSet ? a.positions === b.positions : true;
}

async function openMap(page: Page, map: string, btns: string) {
	mapScope = map;
	btnScope = btns;
	pageErrors.length = 0;
	page.on('pageerror', (e) => pageErrors.push(String(e)));
	await page.goto('/_test/map-cluster');
	await expect(page.locator(`${map} canvas.maplibregl-canvas`)).toBeVisible({ timeout: 40_000 });
	// Let the initial fitBounds settle, or the "has not moved" assertions would
	// race the load animation.
	await page.waitForTimeout(2500);
}

const pageErrors: string[] = [];
let noted = 0;
let before: Camera | null = null;
let firstLabel = '';
let secondLabel = '';

/**
 * The name of the facility currently alone on the map, or '' if none is.
 *
 * Read from the pin's `title`, which carries the facility name. Not
 * `aria-label`: that belongs to the wrapper svelte-maplibre creates, where it
 * reads "Map marker" for every pin and so could never tell two apart. The pin
 * itself has no aria-label at all, which is why an earlier version of this
 * helper always came back empty.
 */
async function pickedLabel(page: Page) {
	if ((await page.locator(picked()).count()) === 0) return '';
	const el = page.locator(picked()).first();
	return ((await el.getAttribute('title')) ?? (await el.innerText())).trim();
}

Given('I open the facility section', async ({ page }) => {
	// <Facility> wraps buttons and map together, so one scope serves both.
	await openMap(page, '#map-current', '#map-current');
});

Given('I open the clustered facility section', async ({ page }) => {
	// The clustered section is a two-column grid: buttons beside the map, not
	// inside it. Scope the buttons to the grid that holds both.
	await openMap(page, '#map-clustered', '#map-clustered-buttons');
});

Given('I have zoomed the map in on one corner', async ({ page }) => {
	// Three clicks on the zoom-in control, which is how a reader would do it.
	for (let i = 0; i < 3; i++) {
		await page.locator(`${mapScope} .maplibregl-ctrl-zoom-in`).click();
		await page.waitForTimeout(400);
	}
	await page.waitForTimeout(800);
});

When('I hover a facility button', async ({ page }) => {
	before = await camera(page);
	const btn = page.locator(buttons()).first();
	firstLabel = (await btn.innerText()).trim();
	await btn.hover();
	await page.waitForTimeout(1200);
});

When('I then hover a different facility button', async ({ page }) => {
	const btn = page.locator(buttons()).nth(1);
	secondLabel = (await btn.innerText()).trim();
	await btn.hover();
	await page.waitForTimeout(1200);
});

When('I hover each facility button in turn', async ({ page }) => {
	const all = page.locator(buttons());
	const n = Math.min(await all.count(), 5);
	for (let i = 0; i < n; i++) {
		await all.nth(i).hover();
		await page.waitForTimeout(500);
	}
	secondLabel = (await all.nth(n - 1).innerText()).trim();
	await page.waitForTimeout(700);
});

When('I hover a facility button whose facility sits inside a cluster', async ({ page }) => {
	// The crowded pair: Pharmacie Chedorge and the Laboratoire are 34m apart, so
	// at the starting zoom they are merged into one bubble.
	noted = await page.locator(markers()).count();
	const btn = page.locator(buttons()).filter({ hasText: 'Pharmacie' }).first();
	firstLabel = (await btn.innerText()).trim();
	await btn.hover();
	await page.waitForTimeout(1600);
});

When('I move the pointer off it', async ({ page }) => {
	before = await camera(page);
	await page.mouse.move(5, 5);
	await page.waitForTimeout(1200);
});

Then('the map returns to the frame that fits every facility', async ({ page }) => {
	// Whatever is drawn is inside the viewport: the reset undid the zoom.
	const box = await page.locator(`${mapScope} .maplibregl-map`).boundingBox();
	const all = await page.locator(markers()).all();
	expect(all.length, 'no markers on the map').toBeGreaterThan(0);
	for (const marker of all) {
		const m = await marker.boundingBox();
		if (!m) continue;
		expect(m.x + m.width, 'a facility is off the left edge').toBeGreaterThan(box!.x - 1);
		expect(m.x, 'a facility is off the right edge').toBeLessThan(box!.x + box!.width + 1);
		expect(m.y + m.height, 'a facility is off the top edge').toBeGreaterThan(box!.y - 1);
		expect(m.y, 'a facility is off the bottom edge').toBeLessThan(box!.y + box!.height + 1);
	}
});

Then('the zoom is the one that fits every facility', async ({ page }) => {
	// The scale bar is the readable proxy for zoom. Fitting a city-wide set
	// keeps it in hundreds of metres or more; zooming to one facility would drop
	// it to tens.
	const scale = (await camera(page)).scale;
	expect(scale, 'no scale bar to read the zoom from').not.toBe('');
	if (scale.includes('km')) return; // kilometres is wider still
	const metres = parseInt(scale, 10);
	expect(metres, `the map zoomed in past a whole-set view (${scale})`).toBeGreaterThanOrEqual(200);
});

Then('exactly one facility is on the map', async ({ page }) => {
	await expect(page.locator(markers())).toHaveCount(1, { timeout: 5000 });
});

Then("that facility's marker is the picked one", async ({ page }) => {
	await expect(page.locator(picked())).toHaveCount(1, { timeout: 5000 });
});

Then('the second facility is the one on the map', async ({ page }) => {
	const label = await pickedLabel(page);
	expect(label, 'nothing is on the map after the second hover').not.toBe('');
	// The scenario is only meaningful if the two hovers were different buttons.
	expect(secondLabel, 'the two hovers landed on the same button').not.toBe(firstLabel);
	// The point of the rule: the choice moved, rather than sticking on the first.
	expect(label, 'the map kept showing the first facility').toBe(secondLabel);
});

Then('the last facility hovered is the one on the map', async ({ page }) => {
	const label = await pickedLabel(page);
	expect(label, 'nothing is on the map after several hovers').not.toBe('');
	expect(label, 'the map stopped following the pointer part-way down the list').toBe(
		secondLabel
	);
});

Then('no error was raised in the page', async () => {
	expect(pageErrors, 'the page threw while the pointer moved down the list').toEqual([]);
});

Then('every facility is on the map again', async ({ page }) => {
	// Back to the full set: leaving a button is a release, not a selection.
	await expect(page.locator(markers())).not.toHaveCount(1, { timeout: 5000 });
	await expect(page.locator(picked())).toHaveCount(0);
});

Then('the view has not moved', async ({ page }) => {
	const after = await camera(page);
	expect(sameView(after, before!), 'the camera moved when the pointer left').toBe(true);
});

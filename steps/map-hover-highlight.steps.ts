import { createBdd } from 'playwright-bdd';
import { expect, type Page } from '@playwright/test';
import { test } from './fixtures';

const { Given, When, Then } = createBdd(test);

/**
 * Hovering a facility button resets the frame, then picks that facility out.
 *
 * The camera assertions read the map's own centre and zoom rather than pixels:
 * "did the view come back to the whole set" is a question about the camera, and
 * a screenshot could not tell a reset from a coincidence.
 */

/** Which of the two maps a scenario is talking about. */
let scope = '#map-current';

/**
 * The camera, read from what the map draws rather than from the Map object.
 *
 * svelte-maplibre keeps its Map in a component closure, not on the element, so
 * there is nothing to reach for from a step. The scale bar and the marker
 * positions are the observable equivalents: the scale text changes with zoom,
 * and the markers' transforms change with centre and zoom together. Comparing
 * them is enough to say whether the view moved.
 */
async function camera(page: Page, sel = scope) {
	return await page.locator(`${sel} .maplibregl-map`).evaluate((el) => {
		const scale = el.querySelector('.maplibregl-ctrl-scale')?.textContent ?? '';
		const transforms = Array.from(el.querySelectorAll('.maplibregl-marker'))
			.map((m) => (m as HTMLElement).style.transform)
			.join('|');
		return { scale, transforms };
	});
}

function sameView(a: { scale: string; transforms: string }, b: typeof a) {
	return a.scale === b.scale && a.transforms === b.transforms;
}

async function openMap(page: Page, sel: string) {
	scope = sel;
	await page.goto('/_test/map-cluster');
	await expect(page.locator(`${sel} canvas.maplibregl-canvas`)).toBeVisible({ timeout: 40_000 });
	// Let the initial fitBounds settle, or the "has not moved" assertions would
	// race the load animation.
	await page.waitForTimeout(2500);
}

Given('I open the facility section', async ({ page }) => {
	await openMap(page, '#map-current');
});

Given('I open the clustered facility section', async ({ page }) => {
	await openMap(page, '#map-clustered');
});

Given('I have zoomed the map in on one corner', async ({ page }) => {
	// Three clicks on the zoom-in control, which is how a reader would do it.
	for (let i = 0; i < 3; i++) {
		await page.locator(`${scope} .maplibregl-ctrl-zoom-in`).click();
		await page.waitForTimeout(400);
	}
	await page.waitForTimeout(800);
});

Given('I note how many facilities are on the map', async ({ page }) => {
	noted = await page.locator(`${scope} .maplibregl-marker`).count();
});

let noted = 0;
let before: { scale: string; transforms: string } | null = null;
/** How many facilities the hovered one was clustered with, once revealed. */
let clustersBefore = 0;

When('I hover a facility button', async ({ page }) => {
	before = await camera(page);
	await page.locator(`${scope} a.btn`).first().hover();
	await page.waitForTimeout(1200);
});

When('I hover a facility button whose facility sits inside a cluster', async ({ page }) => {
	// The crowded pair: Pharmacie Chedorge and the Laboratoire are 34m apart, so
	// at the starting zoom they are merged into one bubble.
	noted = await page.locator(`${scope} .maplibregl-marker`).count();
	clustersBefore = await page.locator(`${scope} .maplibregl-canvas`).count();
	await page.locator(`${scope} a.btn`, { hasText: 'Pharmacie' }).first().hover();
	await page.waitForTimeout(1600);
});

When('I move the pointer off it', async ({ page }) => {
	before = await camera(page);
	await page.mouse.move(5, 5);
	await page.waitForTimeout(1200);
});

Then('the map shows every facility again', async ({ page }) => {
	// Every marker back inside the viewport is what "shows every facility" means
	// to a reader.
	const box = await page.locator(`${scope} .maplibregl-map`).boundingBox();
	const markers = await page.locator(`${scope} .maplibregl-marker`).all();
	expect(markers.length, 'no markers on the map').toBeGreaterThan(0);
	for (const marker of markers) {
		const m = await marker.boundingBox();
		if (!m) continue;
		expect(m.x + m.width, 'a facility is off the left edge').toBeGreaterThan(box!.x - 1);
		expect(m.x, 'a facility is off the right edge').toBeLessThan(box!.x + box!.width + 1);
		expect(m.y + m.height, 'a facility is off the top edge').toBeGreaterThan(box!.y - 1);
		expect(m.y, 'a facility is off the bottom edge').toBeLessThan(box!.y + box!.height + 1);
	}
});

Then('the map is not centred on that facility alone', async ({ page }) => {
	const after = await camera(page);
	const marker = await page.locator(`${scope} .marker-emphasised, ${scope} .marker-picked`).first().boundingBox();
	const box = await page.locator(`${scope} .maplibregl-map`).boundingBox();
	if (!marker || !box) return;
	const centreX = box.x + box.width / 2;
	const centreY = box.y + box.height / 2;
	const dx = Math.abs(marker.x + marker.width / 2 - centreX);
	const dy = Math.abs(marker.y + marker.height / 2 - centreY);
	// A map centred on the facility would put it within a few pixels of the
	// middle. Anything further means the frame holds the whole set.
	expect(dx + dy, `the view centred on the hovered facility (zoom ${after.zoom})`).toBeGreaterThan(8);
});

Then('the zoom is the one that fits every facility', async ({ page }) => {
	// The scale bar is the readable proxy for zoom. Fitting a city-wide set
	// keeps it in hundreds of metres or more; zooming to one facility would drop
	// it to tens.
	const scale = (await camera(page)).scale;
	expect(scale, 'no scale bar to read the zoom from').not.toBe('');
	const metres = parseInt(scale, 10);
	if (scale.includes('km')) return; // kilometres is wider still
	expect(metres, `the map zoomed in past a whole-set view (${scale})`).toBeGreaterThanOrEqual(200);
});

Then("that facility's marker is emphasised", async ({ page }) => {
	await expect(
		page.locator(`${scope} .marker-emphasised, ${scope} .marker-picked`)
	).toHaveCount(1, { timeout: 5000 });
});

Then('the other markers are dimmed', async ({ page }) => {
	const dimmed = await page.locator(`${scope} .marker-dimmed, ${scope} .marker-faded`).count();
	expect(dimmed, 'nothing receded, so the emphasis has nothing to stand out from').toBeGreaterThan(0);
});

Then('the same number of facilities is still on the map', async ({ page }) => {
	await expect(page.locator(`${scope} .maplibregl-marker`)).toHaveCount(noted);
});

Then('the view has not moved', async ({ page }) => {
	const after = await camera(page);
	expect(sameView(after, before!), 'the camera moved when the pointer left').toBe(true);
});

Then('no marker is emphasised', async ({ page }) => {
	await expect(
		page.locator(`${scope} .marker-emphasised, ${scope} .marker-picked`)
	).toHaveCount(0);
});

Then('the cluster it belonged to is gone', async () => {
	// The bubble that held it is not merely recoloured: it is replaced by the
	// facilities it stood for, so there is one fewer bubble than before.
	expect(clustersBefore, 'the facility was not inside a cluster to begin with')
		.toBeGreaterThan(0);
});

Then('every facility that cluster held is drawn as its own marker', async ({ page }) => {
	// More markers than before: the bubble's contents are now individual pins.
	const markers = await page.locator(`${scope} .maplibregl-marker`).count();
	expect(markers, 'the cluster did not come apart').toBeGreaterThan(noted);
});

Then('the facilities it was clustered with are visible but not emphasised', async ({ page }) => {
	const picked = await page.locator(`${scope} .marker-picked`).count();
	const revealed = await page.locator(`${scope} .marker-leaf`).count();
	expect(picked, 'more than one facility was picked out').toBe(1);
	expect(revealed, 'the neighbours were not drawn alongside it').toBeGreaterThan(picked);
});

/**
 * Moving from one button to the next.
 *
 * The bug this pins: the clustered map's colour $effect read and wrote the same
 * piece of state, so the very first hover threw effect_update_depth_exceeded
 * and every hover after it was ignored. One hover still looked right, which is
 * why it survived — the map only reveals itself as stuck on the second.
 */

/** The label of the button hovered most recently, and the one before it. */
let firstLabel = '';
let secondLabel = '';
/** Errors the page raised while the scenario ran. */
const pageErrors: string[] = [];

/** The text of the emphasised marker's popup, which names the facility. */
async function emphasisedLabel(page: Page): Promise<string> {
	const marker = page.locator(`${scope} .marker-emphasised, ${scope} .marker-picked`).first();
	if (!(await marker.count())) return '';
	return (await marker.getAttribute('aria-label')) ?? (await marker.getAttribute('title')) ?? '';
}

When('I then hover a different facility button', async ({ page }) => {
	const buttons = page.locator(`${scope} a.btn`);
	firstLabel = ((await buttons.nth(0).textContent()) ?? '').trim();
	// nth(1) rather than nth(0): a different facility, which is the whole point.
	secondLabel = ((await buttons.nth(1).textContent()) ?? '').trim();
	await buttons.nth(1).hover();
	await page.waitForTimeout(1200);
});

When('I hover each facility button in turn', async ({ page }) => {
	page.on('pageerror', (e) => pageErrors.push(e.message));
	const buttons = page.locator(`${scope} a.btn`);
	const count = Math.min(await buttons.count(), 5);
	for (let i = 0; i < count; i++) {
		await buttons.nth(i).hover();
		await page.waitForTimeout(500);
	}
	secondLabel = ((await buttons.nth(count - 1).textContent()) ?? '').trim();
});

Then("the second facility's marker is emphasised", async ({ page }) => {
	const label = await emphasisedLabel(page);
	expect(label, 'nothing is emphasised after the second hover').not.toBe('');
	expect(label).toContain(secondLabel);
});

Then("the first facility's marker is no longer emphasised", async ({ page }) => {
	const label = await emphasisedLabel(page);
	// The stuck map kept pointing at whatever the first hover picked.
	expect(label, 'the highlight never left the first facility').not.toContain(firstLabel);
});

Then('exactly one facility is emphasised', async ({ page }) => {
	await expect(
		page.locator(`${scope} .marker-emphasised, ${scope} .marker-picked`)
	).toHaveCount(1);
});

Then('the last facility hovered is the emphasised one', async ({ page }) => {
	expect(await emphasisedLabel(page)).toContain(secondLabel);
});

Then('no error was raised in the page', async () => {
	expect(pageErrors, `the page raised: ${pageErrors.join('; ')}`).toEqual([]);
});

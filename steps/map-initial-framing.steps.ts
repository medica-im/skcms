import { createBdd } from 'playwright-bdd';
import { expect, type Page } from '@playwright/test';
import { test } from './fixtures';
// `with { type: 'json' }` because these steps run under Node's ESM loader
// rather than Vite, and it refuses a JSON module without the attribute.
import facilitiesFixture from '../src/routes/(common)/_test/map-cluster/facilities.fixture.json' with { type: 'json' };

const { Given, When, Then } = createBdd(test);

/**
 * The opening frame of the facility map.
 *
 * Everything here is read from what the map *draws*. svelte-maplibre keeps its
 * Map object in a component closure and MapLibre leaves no handle on the
 * container element, so there is nothing to call project() on from a step —
 * the same constraint map-hover-highlight.steps.ts works under, and it reaches
 * for the same two observables.
 *
 * Marker transforms are not usable on their own here: the clustered map paints
 * its bubbles into the WebGL canvas, so only un-clustered leaves become
 * `.maplibregl-marker` elements. On a crowded directory a *correct* clustered
 * map shows two DOM nodes for thirteen facilities. Counting or measuring them
 * would describe how MapLibre chose to group the points rather than whether the
 * frame holds them.
 *
 * The scale control is what survives that. It reports the ground distance the
 * map is showing, which is a fact about the camera and not about the rendering
 * strategy — and comparing it against the real extent of the facilities is
 * data-independent. That matters more than usual for this regression: it is
 * invisible on tightly clustered data and obvious on spread-out data, so a
 * check that only held for one shape of dataset would prove very little.
 */

const SELECTOR = { current: '#map-current', clustered: '#map-clustered' } as const;
type MapName = keyof typeof SELECTOR;

function selectorFor(name: string): string {
	const sel = SELECTOR[name as MapName];
	if (!sel) throw new Error(`unknown map "${name}" — expected current or clustered`);
	return sel;
}

/** Metres per pixel, from the scale bar: its label over its rendered width. */
async function groundScale(page: Page, sel: string): Promise<number> {
	const bar = page.locator(`${sel} .maplibregl-ctrl-scale`).first();
	await expect(bar, `the ${sel} map drew no scale bar to read its zoom from`).toBeVisible({
		timeout: 20_000
	});
	const read = await bar.evaluate((el) => ({
		text: el.textContent ?? '',
		width: el.getBoundingClientRect().width
	}));
	const match = read.text.trim().match(/^([\d.]+)\s*(km|m)$/);
	expect(match, `could not parse the scale bar "${read.text}"`).not.toBeNull();
	const metres = Number(match![1]) * (match![2] === 'km' ? 1000 : 1);
	expect(read.width, 'the scale bar has no width to measure against').toBeGreaterThan(0);
	return metres / read.width;
}

/** The map's drawing area in pixels. */
async function mapBox(page: Page, sel: string) {
	const box = await page.locator(`${sel} .maplibregl-map`).boundingBox();
	expect(box, `the ${sel} map has no box`).not.toBeNull();
	return box!;
}

/** Facilities as the page itself received them, so no fixture has to agree. */
async function facilityExtent(page: Page) {
	// The fixture the page draws, not `${origin}/api/v2/public/facilities`.
	//
	// Those are two different datasets whenever the page is served by a site
	// whose own directory is not Lyon 3 — under Playwright, always: the worker
	// sites carry six seeded facilities scattered across France. Reading the API
	// measured an 11.6 km span against a map drawing a 4 km one and reported the
	// frame as too small, when the frame was right and the yardstick was wrong.
	//
	// _test/map-cluster/+page.server.ts imports this same file.
	const list = facilitiesFixture as Array<Record<string, any>>;
	const coords: [number, number][] = list
		.map((f: Record<string, any>) => f.address ?? {})
		.map((a: Record<string, any>) => [Number(a.longitude), Number(a.latitude)] as [number, number])
		.filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat) && (lng !== 0 || lat !== 0));
	expect(coords.length, 'the site has no facilities, so there is no frame to check').toBeGreaterThan(0);

	const lngs = coords.map((c) => c[0]);
	const lats = coords.map((c) => c[1]);
	const midLat = (Math.max(...lats) + Math.min(...lats)) / 2;
	// Equirectangular is ample here: these are comparisons against a frame, not
	// navigation, and longitude is scaled by the latitude the data sits at.
	const M_PER_DEG = 111_320;
	return {
		count: coords.length,
		widthM: (Math.max(...lngs) - Math.min(...lngs)) * M_PER_DEG * Math.cos((midLat * Math.PI) / 180),
		heightM: (Math.max(...lats) - Math.min(...lats)) * M_PER_DEG
	};
}

async function openMaps(page: Page) {
	await page.goto('/_test/map-cluster');
	for (const sel of Object.values(SELECTOR)) {
		await expect(page.locator(`${sel} canvas.maplibregl-canvas`)).toBeVisible({ timeout: 40_000 });
	}
	// The opening fit is animated, so the camera is still moving for a moment
	// after the canvas appears. Nothing in this feature interacts with the map,
	// so this only lets the *initial* frame settle.
	await page.waitForTimeout(3000);
}

Given('I open the facility maps', async ({ page }) => {
	await openMaps(page);
});

When('I reload the map page', async ({ page }) => {
	await page.reload();
	for (const sel of Object.values(SELECTOR)) {
		await expect(page.locator(`${sel} canvas.maplibregl-canvas`)).toBeVisible({ timeout: 40_000 });
	}
	await page.waitForTimeout(3000);
});

Then(
	/^every facility on the (current|clustered) map is inside the viewport$/,
	async ({ page }, name: string) => {
		const sel = selectorFor(name);
		const [scale, box, data] = await Promise.all([
			groundScale(page, sel),
			mapBox(page, sel),
			facilityExtent(page)
		]);
		if (data.count < 2) return; // one facility is trivially in frame

		// What the map is showing, in metres, against what it has to show.
		const shownW = scale * box.width;
		const shownH = scale * box.height;
		expect(
			shownW,
			`the ${name} map is showing ${Math.round(shownW)}m across but the facilities span ` +
				`${Math.round(data.widthM)}m — the ones outside are invisible to the reader`
		).toBeGreaterThanOrEqual(data.widthM);
		expect(
			shownH,
			`the ${name} map is showing ${Math.round(shownH)}m top to bottom but the facilities span ` +
				`${Math.round(data.heightM)}m — the ones outside are invisible to the reader`
		).toBeGreaterThanOrEqual(data.heightM);
	}
);

Then(
	/^the facilities span a usable share of the (current|clustered) map$/,
	async ({ page }, name: string) => {
		const sel = selectorFor(name);
		const [scale, box, data] = await Promise.all([
			groundScale(page, sel),
			mapBox(page, sel),
			facilityExtent(page)
		]);
		if (data.count < 2) return;

		// A frame can hold every facility by being zoomed out to a whole
		// continent, which satisfies the rule above and is useless to read.
		const shareX = data.widthM / (scale * box.width);
		const shareY = data.heightM / (scale * box.height);
		const share = Math.max(shareX, shareY);
		// Deliberately generous: a set arranged along one axis legitimately fills
		// only that axis, so the larger share is the one that counts. This is
		// here to catch a wildly over-zoomed frame, not to police padding.
		expect(
			share,
			`the facilities occupy only ${Math.round(share * 100)}% of the ${name} map — ` +
				`the frame is not fitted to them`
		).toBeGreaterThan(0.2);
	}
);

Then('both maps are showing the same area', async ({ page }) => {
	const [current, clustered] = await Promise.all([
		groundScale(page, SELECTOR.current),
		groundScale(page, SELECTOR.clustered)
	]);
	// Both maps draw the same facilities in boxes of the same width, so a
	// clustered map fitted to its data lands on materially the same scale as the
	// one that ships. A factor of two is a full zoom level — far more than
	// differing padding can account for, and the assertion that still bites when
	// every facility is within a few hundred metres of the others.
	const ratio = Math.max(current, clustered) / Math.min(current, clustered);
	expect(
		ratio,
		`the clustered map opened at ${clustered.toFixed(2)} m/px against ` +
			`${current.toFixed(2)} m/px for the map that ships — a factor of ${ratio.toFixed(1)}`
	).toBeLessThan(2);
});

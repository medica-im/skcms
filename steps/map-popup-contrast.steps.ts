import { createBdd } from 'playwright-bdd';
import { expect, type Page, type Locator } from '@playwright/test';
import { test } from './fixtures';

const { Given, When, Then } = createBdd(test);

/**
 * Contrast of the facility map's popup link against the card it sits on.
 *
 * Everything here is measured from the *rendered* page. The colours in question
 * are not all declared: MapLibre.svelte leaves the popup card's background to
 * the browser, and Chromium and Firefox fill that gap differently. Reading
 * getComputedStyle would report the declared value and miss exactly the defect
 * this feature is about, so the card's colour is sampled from a screenshot of
 * the pixels behind the link.
 */

/** Relative luminance, WCAG 2.1 §dfn-relative-luminance. */
function luminance([r, g, b]: [number, number, number]) {
	const [rs, gs, bs] = [r, g, b].map((c) => {
		const s = c / 255;
		return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/** Contrast ratio, WCAG 2.1 §dfn-contrast-ratio. */
function contrast(fg: [number, number, number], bg: [number, number, number]) {
	const [lo, hi] = [luminance(fg), luminance(bg)].sort((a, b) => a - b);
	return (hi + 0.05) / (lo + 0.05);
}

function parseRgb(value: string): [number, number, number] {
	const nums = value.match(/[\d.]+/g)?.map(Number) ?? [];
	if (nums.length < 3) throw new Error(`not a colour: ${value}`);
	return [nums[0], nums[1], nums[2]];
}

/**
 * The most common colour in a PNG screenshot of one element, ignoring the text
 * pixels themselves. Decoded in the browser through a canvas, so the step needs
 * no image library.
 *
 * Taking the mode rather than an average matters: a card carrying text is
 * mostly card, and averaging would blend the letters into the background and
 * report a colour that is on neither.
 */
async function dominantColour(page: Page, shot: Buffer): Promise<[number, number, number]> {
	const base64 = shot.toString('base64');
	return await page.evaluate(async (b64) => {
		const img = new Image();
		img.src = `data:image/png;base64,${b64}`;
		await img.decode();
		const canvas = document.createElement('canvas');
		canvas.width = img.width;
		canvas.height = img.height;
		const ctx = canvas.getContext('2d')!;
		ctx.drawImage(img, 0, 0);
		const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
		const tally = new Map<string, number>();
		for (let i = 0; i < data.length; i += 4) {
			if (data[i + 3] < 250) continue; // skip anything not fully opaque
			const key = `${data[i]},${data[i + 1]},${data[i + 2]}`;
			tally.set(key, (tally.get(key) ?? 0) + 1);
		}
		let best = '255,255,255';
		let bestCount = -1;
		for (const [key, count] of tally) {
			if (count > bestCount) {
				best = key;
				bestCount = count;
			}
		}
		return best.split(',').map(Number) as [number, number, number];
	}, base64);
}

Given('the site is in {string} mode', async ({ page }, mode: string) => {
	// Both halves matter. emulateMedia drives prefers-color-scheme, which is
	// what app.html's inline script reads to put `dark` on <html> — and what a
	// browser reads to decide its own dark-mode styling of undeclared surfaces,
	// which is the difference between the two engines here.
	await page.emulateMedia({ colorScheme: mode === 'dark' ? 'dark' : 'light' });
});

When('I open the facility map', async ({ page }) => {
	// A dev-only fixture route rendering the map alone (see
	// src/routes/(common)/_test/map-popup). The colours under test belong to the
	// component, so the scenario should not also depend on a tenant's data or on
	// scrolling a section of the home page into view.
	await page.goto('/_test/map-popup');
	const section = page.locator('#test-map');
	// The canvas is WebGL; wait for MapLibre to have drawn rather than for the
	// element to merely exist.
	await expect(section.locator('canvas.maplibregl-canvas')).toBeVisible({ timeout: 30_000 });
});

When('a facility marker popup is open', async ({ page }) => {
	// Facility.svelte passes showTooltip, so the popups open themselves. If that
	// ever changes, click a marker instead of failing obscurely.
	const popup = page.locator('.maplibregl-popup').first();
	if (!(await popup.isVisible().catch(() => false))) {
		await page.locator('.maplibregl-marker').first().click();
	}
	await expect(popup).toBeVisible({ timeout: 30_000 });
	await expect(popup.locator('a.anchor').first()).toBeVisible({ timeout: 30_000 });
	// Let the map settle so the screenshot is not taken mid-animation.
	await page.waitForTimeout(500);
});

function popupLink(page: Page): Locator {
	return page.locator('.maplibregl-popup a.anchor').first();
}

function popupCard(page: Page): Locator {
	return page.locator('.maplibregl-popup .maplibregl-popup-content').first();
}

const AA_BODY_TEXT = 4.5;

Then('the popup link contrasts with the popup background', async ({ page }) => {
	const link = popupLink(page);
	// The link's own colour is declared, so the cascade is the honest source.
	const fg = parseRgb(await link.evaluate((el) => getComputedStyle(el).color));
	// The card's is not, so it is sampled from what was actually painted.
	const bg = await dominantColour(page, await popupCard(page).screenshot());

	const ratio = contrast(fg, bg);
	expect(
		ratio,
		`popup link rgb(${fg}) on card rgb(${bg}) is ${ratio.toFixed(2)}:1, ` +
			`want >= ${AA_BODY_TEXT}:1 for body text`
	).toBeGreaterThanOrEqual(AA_BODY_TEXT);
});

Then('the popup card has an explicit background colour', async ({ page }) => {
	const declared = await popupCard(page).evaluate((el) => getComputedStyle(el).backgroundColor);
	const nums = declared.match(/[\d.]+/g)?.map(Number) ?? [];
	const alpha = nums.length === 4 ? nums[3] : 1;

	expect(
		alpha,
		`the popup card declares ${declared}, so the browser decides what colour it is — ` +
			`which is why Chromium paints it near-black and Firefox white`
	).toBeGreaterThan(0);

	// Declared is not enough on its own: it has to match what reached the
	// screen. If the browser is overriding it, these two disagree.
	const painted = await dominantColour(page, await popupCard(page).screenshot());
	const declaredRgb = parseRgb(declared);
	const drift = Math.max(...declaredRgb.map((c, i) => Math.abs(c - painted[i])));
	expect(
		drift,
		`the popup card declares rgb(${declaredRgb}) but paints rgb(${painted}) — ` +
			`the browser is restyling it`
	).toBeLessThanOrEqual(8);
});

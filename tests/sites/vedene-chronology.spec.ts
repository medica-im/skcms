import { test, expect, type Page } from '@playwright/test';
import { originFor, requireSite } from './sites';

/**
 * The MSP's history shows its pictures.
 *
 * The chronology came from Wagtail with every image on the old site's
 * /media/, which no longer serves them; the pictures now ship with Vedène's
 * skvar. Loaded means decoded: an <img> whose request 404s is still in the DOM.
 */

const SITE = 'msp-vedene.fr';
const ORIGIN = originFor(SITE);
const OLD_MEDIA = 'msp-vedene.fr/media/';

test.beforeAll(async () => await requireSite(SITE));

async function openChronology(page: Page) {
	await page.goto(`${ORIGIN}/maison-de-sante/chronologie`);
	await page.locator('.tl-timeline').waitFor({ timeout: 20_000 });
}

/** Whether each image matching the selector has finished loading and decoded. */
function loaded(page: Page, selector: string) {
	return page.locator(selector).evaluateAll((imgs) =>
		(imgs as HTMLImageElement[]).map((img) => ({
			src: img.currentSrc || img.src,
			ok: img.complete && img.naturalWidth > 0
		}))
	);
}

test('the title slide shows its picture', async ({ page }) => {
	await openChronology(page);
	await expect
		.poll(async () => (await loaded(page, '.tl-media-image')).some((i) => i.ok), { timeout: 15_000 })
		.toBe(true);
});

test('every thumbnail in the time navigation loads', async ({ page }) => {
	await openChronology(page);
	const selector = '.tl-timemarker-media-container img';
	await expect.poll(async () => (await loaded(page, selector)).length).toBeGreaterThan(0);
	await expect
		.poll(async () => (await loaded(page, selector)).filter((i) => !i.ok).map((i) => i.src), {
			timeout: 15_000
		})
		.toEqual([]);
});

test('nothing is fetched from the old site\'s media', async ({ page }) => {
	const old: string[] = [];
	page.on('request', (request) => {
		if (request.url().includes(OLD_MEDIA)) old.push(request.url());
	});
	await openChronology(page);
	await page.waitForLoadState('networkidle');
	expect(old).toEqual([]);
});

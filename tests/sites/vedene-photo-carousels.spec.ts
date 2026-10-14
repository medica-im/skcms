import { test, expect } from '@playwright/test';
import { originFor, requireSite } from './sites';

/**
 * The workshop and meeting photos, in the same carousel as the team and the
 * facilities: the first picture loads and the reader can move to the next.
 */

const SITE = 'msp-vedene.fr';
const ORIGIN = originFor(SITE);

const PAGES = [
	{ path: '/maison-de-sante/reunion-concertation-pluriprofessionnelle', alt: /réunion de concertation/i },
	{ path: '/education-therapeutique/cancer', alt: /Atelier HOPE/ }
];

test.beforeAll(async () => await requireSite(SITE));

for (const { path, alt } of PAGES) {
	test(`${path} shows its photos in a carousel`, async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 900 });
		await page.goto(`${ORIGIN}${path}`);
		const first = page.getByRole('img', { name: alt }).first();
		await expect(first).toBeVisible({ timeout: 20_000 });
		await expect
			.poll(() => first.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
			.toBe(true);
		await expect(page.getByRole('button', { name: 'Next slide' })).toBeEnabled();
	});
}

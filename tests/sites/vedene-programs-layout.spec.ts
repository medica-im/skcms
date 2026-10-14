import { test, expect, type Page } from '@playwright/test';
import { originFor, requireSite } from './sites';

/**
 * Every Vedène programme page carries the same navigation: the breadcrumb
 * trail above, the category's other programmes below — once, from the
 * (programs) layout, as on sante-gadagne.fr.
 */

const SITE = 'msp-vedene.fr';
const ORIGIN = originFor(SITE);

const PAGES = [
	'/education-therapeutique',
	'/education-therapeutique/diabete',
	'/education-therapeutique/cancer',
	'/education-therapeutique/ecole-du-dos',
	'/education-sante',
	'/education-sante/parentalite-petite-enfance',
	'/prevention',
	'/prevention/alimentation',
	'/prevention/canicule',
	'/prevention/depistage-cancer-colorectal',
	'/prevention/syndrome-epuisement-professionnel'
];

/** ProgramNav's heading: "Notre autre programme…", "Nos programmes…". */
const programList = (page: Page) =>
	page.getByRole('heading', { level: 3, name: /^(Notre|Nos)\s+(autres?\s+)?programmes?\b/ });

test.beforeAll(async () => await requireSite(SITE));

for (const path of PAGES) {
	test(`${path} has the breadcrumb trail and at most one programme list`, async ({ page }) => {
		await page.goto(`${ORIGIN}${path}`);
		await expect(page.getByRole('navigation', { name: "Fil d'Ariane" })).toBeVisible();
		expect(await programList(page).count()).toBeLessThanOrEqual(1);
	});
}

test('a programme page lists the other programmes of its category once', async ({ page }) => {
	await page.goto(`${ORIGIN}/prevention/alimentation`);
	await expect(programList(page)).toHaveCount(1);
});

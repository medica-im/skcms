import { test, expect } from '@playwright/test';
import { originFor, requireSite } from './sites';

/**
 * Every page of Vedène's site renders: 200, a heading, and nothing thrown in
 * the browser on the way.
 */

const SITE = 'msp-vedene.fr';
const ORIGIN = originFor(SITE);

const PAGES = [
	'/',
	'/annuaire',
	'/maison-de-sante/a-propos',
	'/maison-de-sante/activite-physique-adaptee',
	'/maison-de-sante/chronologie',
	'/maison-de-sante/dossier-patient',
	'/maison-de-sante/lexique',
	'/maison-de-sante/projet-de-sante',
	'/maison-de-sante/reunion-concertation-pluriprofessionnelle',
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

test.beforeAll(async () => await requireSite(SITE));

for (const path of PAGES) {
	test(`${path} renders without errors`, async ({ page }) => {
		const errors: string[] = [];
		page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
		page.on('console', (m) => {
			if (m.type() === 'error') errors.push(`console: ${m.text()}`);
		});
		const response = await page.goto(`${ORIGIN}${path}`, { waitUntil: 'networkidle' });
		expect(response?.status()).toBe(200);
		await expect(page.locator('h1')).toHaveCount(1);
		await expect(page.locator('h1')).toBeVisible();
		expect(errors).toEqual([]);
	});
}

test('a profession has its own directory page', async ({ page }) => {
	const response = await page.goto(`${ORIGIN}/annuaire/medecin-generaliste`);
	expect(response?.status()).toBe(200);
});

test('a name typed after /annuaire/ is a 404, not a server error', async ({ page }) => {
	const response = await page.goto(`${ORIGIN}/annuaire/alexis-bernal`);
	expect(response?.status()).toBe(404);
});

test('/contact/ drops its trailing slash like every other page', async ({ page }) => {
	const response = await page.goto(`${ORIGIN}/contact/`);
	expect(response?.status()).toBe(200);
	expect(new URL(page.url()).pathname).toBe('/contact');
});

test('the old /activite-physique-adaptee address leads to its page', async ({ page }) => {
	await page.goto(`${ORIGIN}/activite-physique-adaptee`);
	expect(new URL(page.url()).pathname).toBe('/maison-de-sante/activite-physique-adaptee');
});

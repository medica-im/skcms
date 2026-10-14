import { test, expect } from '@playwright/test';
import { originFor, requireSite } from './sites';

/**
 * Vedène's sitemap.xml: the old site had one that search engines read, so the
 * new one lists the site's pages and every active practitioner's.
 */

const SITE = 'msp-vedene.fr';
const ORIGIN = originFor(SITE);

test.beforeAll(async () => await requireSite(SITE));

async function locs(request: import('@playwright/test').APIRequestContext) {
	const response = await request.get(`${ORIGIN}/sitemap.xml`);
	expect(response.status()).toBe(200);
	expect(response.headers()['content-type']).toContain('xml');
	return [...(await response.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

test('lists the site pages and an active practitioner', async ({ request }) => {
	const urls = await locs(request);
	for (const path of [
		'/',
		'/contact',
		'/sites',
		'/mentions-legales',
		'/politique-de-confidentialite',
		'/maison-de-sante/chronologie',
		'/prevention/alimentation',
		'/education-therapeutique/ecole-du-dos',
		'/e/alexis-bernal-mg-84'
	]) {
		expect(urls, path).toContain(`${ORIGIN}${path}`);
	}
});

test('leaves out an inactive practitioner', async ({ request }) => {
	expect((await locs(request)).some((u) => u.includes('jean-louis-brun'))).toBe(false);
});

test('names only addresses on the site itself', async ({ request }) => {
	for (const url of await locs(request)) expect(url.startsWith(`${ORIGIN}/`), url).toBe(true);
});

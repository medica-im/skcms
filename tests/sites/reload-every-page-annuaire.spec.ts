import { test } from '@playwright/test';
import { requireSite, type SiteName } from './sites';
import { reloadEveryPage } from './reloadEveryPage';

/**
 * Every page survives a hard reload, on a site served at its origin root
 * (annuaire.medica.im). See reloadEveryPage.ts; its twin under a base path is
 * reload-every-page-unipa.spec.ts.
 */

const SITE: SiteName = 'annuaire.medica.im';

test.beforeAll(async () => await requireSite(SITE));

test('every page of annuaire.medica.im survives a hard reload', async ({ browser }) => {
	test.setTimeout(10 * 60_000);
	await reloadEveryPage(browser, SITE);
});

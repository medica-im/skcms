import { test } from '@playwright/test';
import { requireSite, type SiteName } from './sites';
import { reloadEveryPage } from './reloadEveryPage';

/**
 * Every page survives a hard reload, on the site served under a base path
 * (unipa.fr/annuaire). See reloadEveryPage.ts; its twin without a base path is
 * reload-every-page-annuaire.spec.ts.
 */

const SITE: SiteName = 'unipa.fr';

test.beforeAll(async () => await requireSite(SITE));

test('every page of unipa.fr/annuaire survives a hard reload', async ({ browser }) => {
	test.setTimeout(10 * 60_000);
	await reloadEveryPage(browser, SITE);
});

import { test, expect } from '@playwright/test';
import { STAGING_ORIGINS, basePathFor, type SiteName } from '../sites/sites';
import { reloadEveryPage } from '../sites/reloadEveryPage';

/**
 * Every page of a staging site survives a cold load, after a release.
 *
 * Run by scripts/check-staging.sh, one site at a time, with that site's
 * address in STAGING_CHECK_ORIGIN (images.yml's, through
 * scripts/lib/staging-sites.sh). Staging serves the built Node server, so an
 * error that exists only in the bundled SSR, or a page that answers 200 and
 * dies on hydration, shows here and nowhere on dev. See reloadEveryPage.ts for
 * what fails a page.
 */

process.env.SITE_TARGET = 'staging';

const origin = process.env.STAGING_CHECK_ORIGIN;
const sites = (Object.keys(STAGING_ORIGINS) as SiteName[]).filter(
	(site) => `${STAGING_ORIGINS[site]}${basePathFor(site)}` === origin
);

test('the site to check is a staging site', () => {
	expect(sites, `${origin} is in no STAGING_ORIGINS entry of tests/sites/sites.ts`).toHaveLength(1);
});

for (const site of sites) {
	test(`every page of ${site} on staging survives a cold load`, async ({ browser }) => {
		test.setTimeout(10 * 60_000);
		await reloadEveryPage(browser, site);
	});
}

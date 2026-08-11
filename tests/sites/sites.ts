/**
 * Which site a spec is about.
 *
 * Most of the suite is site-agnostic: it browses whichever worker origin
 * Playwright hands it, and asserts behaviour every site shares. Some pages are
 * not shared at all. The contact page exists only in Lyon 3's skvar branch —
 * sante-gadagne's does not have the route — so a spec measuring its layout has
 * to say which site it means, or it will fail against a page that was never
 * meant to be there.
 *
 * Naming the site rather than a hostname keeps the choice in one place: a site
 * that moves origin is edited here, not in every spec that mentions it.
 */

/** Dev origin per site, matching the .env.dev.<site> files at the repo root. */
export const SITE_ORIGINS = {
	'santelyon3.fr': 'https://dev.santelyon3.fr',
	'sante-gadagne.fr': 'https://dev.sante-gadagne.fr',
	'annuaire.medica.im': 'http://dev.annuaire.medica.im',
	'ipa.medica.im': 'http://dev.ipa.medica.im',
	'sandbox.medica.im': 'http://dev.sandbox.medica.im',
	'ssc.medica.im': 'http://dev.ssc.medica.im'
} as const;

export type SiteName = keyof typeof SITE_ORIGINS;

/**
 * The origin a site-specific spec should browse.
 *
 * SITE_ORIGIN overrides it, so the same spec can be pointed at staging or at a
 * worker without editing it.
 */
export function originFor(site: SiteName): string {
	const override = process.env.SITE_ORIGIN;
	if (override) return override.replace(/\/$/, '');
	const origin = SITE_ORIGINS[site];
	if (!origin) {
		throw new Error(
			`unknown site "${site}"; add it to SITE_ORIGINS in tests/sites/sites.ts`
		);
	}
	return origin;
}

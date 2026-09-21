/**
 * Which theme the switcher should start on.
 *
 * Deliberately a pure function of the two inputs, so the rule can be stated
 * and tested without a browser: the appbar reads `storeTheme` from
 * localStorage and the site's default from page data, and those are the only
 * two things that decide.
 *
 * The order matters and is the whole point. `SITE_THEME` is a *default*, not a
 * policy — `hooks.server.ts` says so, and the theme switcher exists — so a
 * stored choice always wins. Seeding unconditionally would silently undo the
 * visitor's selection on every page load.
 *
 * `'wintry'` where neither is set: every site that predates SITE_THEME served
 * it, and must go on doing so.
 */
export function initialTheme(
	stored: string | null | undefined,
	siteTheme: string | null | undefined
): string {
	// An empty string is localStorage saying "nothing", not a theme name.
	if (stored) return stored;
	return siteTheme || 'wintry';
}

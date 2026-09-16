/**
 * The navigation of a *parent* site this app is embedded in.
 *
 * Only meaningful where the directory is served under a base path as a section
 * of someone else's website — unipa.fr/annuaire is the first. A site served at
 * the root of its own domain has no parent, exports no `siteMenu`, and every
 * consumer of this module falls back to the shared app bar and footer.
 *
 * The data lives in the skvar submodule, alongside `variables.ts`, because it
 * varies per site and must not be visible to the others. It is generated from
 * the parent site's rendered menu by `scripts/wp-menu-import.sh` and then
 * curated by hand: the committed file *is* the override, so hiding an item or
 * renaming it is an edit to the generated tree rather than a second mechanism
 * layered on top.
 *
 * Deliberately a plain data shape with no imports. Swapping the source for an
 * API response later should not touch the components that render it.
 */

export interface SiteMenuItem {
	/**
	 * What the item is called here, which need not be what the parent site
	 * calls it. The importer preserves an edited label across re-runs.
	 */
	label: string;
	/**
	 * Absolute for a page on the parent site, app-relative (already carrying
	 * `base`) for one of ours. `external` says which, rather than having every
	 * renderer re-parse the URL.
	 */
	href: string;
	/**
	 * Leaves this app. Drives `rel`/`target` and keeps SvelteKit from trying to
	 * client-side navigate to a page it does not serve.
	 */
	external?: boolean;
	/**
	 * Drop this item *and its children* from every menu.
	 *
	 * Hidden rather than deleted so the next import still recognises the entry
	 * and does not silently reinstate it — a deleted line is indistinguishable
	 * from one the parent site has not published yet.
	 */
	hidden?: boolean;
	children?: SiteMenuItem[];
}

export interface ParentSite {
	/** Display name, for link titles and the logo's alt text. */
	name: string;
	/**
	 * The name written out, where there is room for it.
	 *
	 * The app bar has none — the short form sits beside the logo in a row that
	 * also carries the menu and the account controls — but a footer does, and an
	 * acronym alone tells a first-time reader nothing about whose site this is.
	 *
	 * Optional: a parent site whose name is not an abbreviation has nothing to
	 * expand, and `name` is used as it stands.
	 */
	longName?: string;
	/** Origin of the parent site. Where the logo links to. */
	url: string;
	/** Absolute URL of the parent site's logo. */
	logo: string;
	logoAlt: string;
	/**
	 * The Skeleton theme built to match this parent site, if there is one.
	 *
	 * Named here rather than in the app bar, which offers it in the theme
	 * picker: a shared component should not know that a theme called `unipa`
	 * exists, or which site it belongs to. The site declares its own.
	 *
	 * Optional — a parent site the app has no matching theme for is served in
	 * whatever the visitor already had.
	 */
	theme?: string;
	/** Emoji for that theme's entry in the picker. */
	themeIcon?: string;
}

export interface SiteMenuFooter {
	/**
	 * Whether the footer links to our `/sites` page. False for unipa: the page
	 * still resolves, it is simply not advertised.
	 */
	showSites: boolean;
	/** Contact belongs to the parent site — it is their address, not ours. */
	contactHref: string;
	/**
	 * Legal notice stays OURS even though everything around it is theirs: this
	 * app is hosted by a different provider than the parent site, so it owes
	 * its own mentions légales.
	 */
	legalHref: string;
	/** Anything else the parent site's footer carries, e.g. a privacy policy. */
	extraLinks?: SiteMenuItem[];
}

export interface SiteMenu {
	parentSite: ParentSite;
	items: SiteMenuItem[];
	footer: SiteMenuFooter;
}

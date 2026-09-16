import type { SiteMenu, SiteMenuItem } from '$lib/interfaces/siteMenu.interface';

/**
 * The parent site's menu, if this site has one.
 *
 * Read from the skvar submodule, which is one branch per site: the file exists
 * only on a branch belonging to a site embedded in someone else's website, and
 * is absent everywhere else. `null` is therefore the normal case, and every
 * consumer falls back to the shared app bar and footer.
 *
 * `import.meta.glob` is resolved by Vite at build time against the branch that
 * is checked out, so this is a build-time constant per site rather than a
 * runtime lookup — the same technique `src/hooks.ts` uses to decide whether
 * skvar supplies its own /contact. A missing file is not an error: it does not
 * appear in the glob result at all.
 *
 * Eager because it is a plain data module read during the first render of every
 * page; deferring it would only add a promise to the app bar.
 */
const modules = import.meta.glob<{ siteMenu?: SiteMenu }>(
	'../../routes/(skvar)/(var)/siteMenu.ts',
	{ eager: true }
);

const loaded = Object.values(modules)[0]?.siteMenu;

export const siteMenu: SiteMenu | null = loaded ?? null;

/**
 * Whether this app is embedded in a parent site.
 *
 * Read this rather than the organization's category: unipa is typed `cpts` like
 * several standalone sites, so branching on the category would change theirs
 * too. What distinguishes this site is that it has a parent, which is exactly
 * what the presence of the menu says.
 */
export const hasParentSite = siteMenu !== null;

/**
 * The menu with hidden items — and their subtrees — removed.
 *
 * Hiding is curation applied to generated data, so it is resolved once here
 * rather than in each renderer, where one forgetting the check would quietly
 * show an item that was deliberately dropped.
 */
export function visibleItems(items: SiteMenuItem[] = siteMenu?.items ?? []): SiteMenuItem[] {
	return items
		.filter((item) => !item.hidden)
		.map((item) => ({
			...item,
			children: item.children ? visibleItems(item.children) : undefined
		}));
}

/**
 * The parent site writes its menu in capitals, and its own header has the
 * full width of the page to do that in. Ours also carries the site name, the
 * theme control and the account controls, and the same labels then need
 * about half as much room again as there is — they wrapped to a second row
 * and doubled the height of the bar on every page.
 *
 * Cased here rather than in the data: the capitals are how the parent site
 * writes these names, so they belong in the file the importer regenerates.
 * This is presentation, and only this bar's.
 *
 * Done in script rather than with `lowercase first-letter:uppercase`, which
 * silently half-works: Tailwind's `first-letter:` needs a block box and
 * these buttons are inline-flex, so the lowercase applied and the capital
 * never came back — "boîte à outils", "contact". CSS `capitalize` is not the
 * answer either, since it title-cases every word ("Boîte À Outils").
 *
 * A word that is all capitals and has no lower-case form of its own is left
 * alone: IPA is the profession this whole site is about, and "Ipa" reads as
 * a mistake.
 */
/**
 * Shared rather than per-site: these are the French healthcare abbreviations
 * every tenant of this app works in, not one site's vocabulary. A site whose
 * menu needs a word kept in capitals that is not here should get it added here
 * — the next tenant will want the same one.
 */
const ACRONYMS = new Set(['IPA', 'CPTS', 'MSP', 'URPS', 'ARS']);

export function displayLabel(label: string): string {
	const cased = label
		.split(' ')
		.map((word) => (ACRONYMS.has(word) ? word : word.toLocaleLowerCase('fr')))
		.join(' ');
	return cased.charAt(0).toLocaleUpperCase('fr') + cased.slice(1);
}

/**
 * The parent site's menu with this app's own pages appended.
 *
 * The drawer is the only navigation a phone has, and the parent's menu alone
 * cannot reach the two pages that belong to us: the directory itself, and the
 * legal notice it owes because it is hosted separately from the parent site.
 * Without these the only way back into the app from the drawer is the browser's
 * back button.
 *
 * Appended rather than written into the curated file: that file is regenerated
 * from the parent site's own markup, and an entry that is not in that markup
 * would have to survive every merge as a special case. These are derived from
 * `footer` — the same two URLs the footer already builds — so the site declares
 * them once.
 *
 * `external: false` marks them as ours, which is what lets the tree mark one as
 * the current page; entries on the parent site never are.
 */
export function menuWithOwnPages(
	base: string,
	directoryLabel: string,
	legalLabel: string
): SiteMenuItem[] {
	const items = visibleItems();
	if (!siteMenu) return items;

	const own: SiteMenuItem = {
		label: directoryLabel,
		href: `${base}/`,
		external: false,
		children: [
			{
				label: legalLabel,
				href: `${base}/${siteMenu.footer.legalHref}`,
				external: false
			}
		]
	};

	return [...items, own];
}

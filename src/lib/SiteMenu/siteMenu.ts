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

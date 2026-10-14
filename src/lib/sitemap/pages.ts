/**
 * A site's own pages, for its sitemap.xml: what its menu links to, plus any
 * page the menu leaves out, named by the site's skvar route.
 */
import { base } from '$app/paths';
import type { MenuNavCat } from '$lib/interfaces/variables.interface';
import type { SitemapUrl } from './sitemap';

/** Every category page and every page the menu shows a link to, once, in menu order. */
export function menuPaths(menu: MenuNavCat[]): string[] {
	const paths = new Set<string>();
	for (const category of menu) {
		for (const nav of category.list) {
			if (nav.href) paths.add(nav.href);
			for (const link of nav.list) {
				if (link.active !== false) paths.add(link.href);
			}
		}
	}
	return [...paths];
}

export async function pageUrls(origin: string, paths: string[]): Promise<SitemapUrl[]> {
	return paths.map((path) => ({ loc: `${origin}${base}${path}` }));
}

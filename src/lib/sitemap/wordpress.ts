/**
 * The sitemap URLs of a WordPress site the directory is served under (unipa.fr,
 * with the directory at /annuaire), read from WordPress's public REST API --
 * the same one any visitor can query, so WordPress needs no configuration.
 */
import { fetchJson, type SitemapUrl } from './sitemap';

/** The REST collections behind Yoast's post, page and category sitemaps. */
const WP_COLLECTIONS = ['pages', 'posts', 'categories'] as const;

interface WpItem {
	link: string;
	modified_gmt?: string;
	count?: number;
	yoast_head_json?: { robots?: { index?: string } } | null;
}

const wpPage = (origin: string, collection: string, page: number) =>
	fetchJson<WpItem[]>(
		`${origin}/wp-json/wp/v2/${collection}?per_page=100&page=${page}` +
			'&_fields=link,modified_gmt,count,yoast_head_json.robots'
	);

/** Every item of one collection: page 1 says how many more there are, then those in parallel. */
async function wpCollection(origin: string, collection: string): Promise<WpItem[]> {
	const first = await wpPage(origin, collection, 1);
	const rest = await Promise.all(
		Array.from({ length: first.totalPages - 1 }, (_, i) => wpPage(origin, collection, i + 2))
	);
	return [first, ...rest].flatMap(({ body }) => body);
}

/**
 * @param exclude pathnames kept out whatever WordPress says about them.
 *   WordPress belongs to its editors; a page is left out here rather than by
 *   changing its status or its Yoast settings there.
 */
export async function wordpressUrls(
	origin: string,
	{ exclude = [] }: { exclude?: Iterable<string> } = {}
): Promise<SitemapUrl[]> {
	const excluded = new Set(exclude);
	const collections = await Promise.all(WP_COLLECTIONS.map((c) => wpCollection(origin, c)));
	const urls: SitemapUrl[] = [];
	collections.forEach((items, i) => {
		for (const item of items) {
			// Only this site's own addresses: a link to anywhere else would be
			// rejected by crawlers for the whole file, not just the one URL.
			const link = new URL(item.link, origin);
			if (link.origin !== origin) continue;
			if (excluded.has(link.pathname)) continue;
			// What Yoast leaves out of its own sitemaps: noindex content and
			// categories with no posts.
			if (item.yoast_head_json?.robots?.index === 'noindex') continue;
			if (WP_COLLECTIONS[i] === 'categories' && !item.count) continue;
			urls.push({
				loc: link.href,
				lastmod: item.modified_gmt ? `${item.modified_gmt}Z` : undefined
			});
		}
	});
	return urls;
}

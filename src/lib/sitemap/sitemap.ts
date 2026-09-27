/**
 * What every site's sitemap.xml is made of: the directory's own URLs, a
 * renderer, and a response that is all or nothing.
 *
 * Each site's route (in skvar) only chooses its sources -- the directory
 * alone, or the directory plus the WordPress site it sits under (see
 * ./wordpress.ts) -- and passes them to sitemapResponse.
 *
 * Every URL is built from the request's `url.origin`, which adapter-node takes
 * from ORIGIN -- the public address the instance is served under, and the same
 * value the canonical tag uses. No hostname is written here.
 */
import { base } from '$app/paths';
import { APP_URL } from '$lib/utils/appUrl';
import { entrySlugPageUrl } from '$lib/utils/utils';
import type { Entry } from '$lib/store/directoryStoreInterface';

export interface SitemapUrl {
	loc: string;
	lastmod?: string;
}

export class UpstreamError extends Error {}

/**
 * Per upstream request, body included. An upstream that hangs rather than
 * fails would otherwise hold the request until nginx gives up with a 504;
 * cut off here, it becomes the 503 that tells a crawler to keep its last copy.
 */
export const UPSTREAM_TIMEOUT_MS = 10_000;

export async function fetchJson<T>(url: string): Promise<{ body: T; totalPages: number }> {
	const controller = new AbortController();
	const timer = setTimeout(
		() => controller.abort(new UpstreamError(`${url} -> no answer in ${UPSTREAM_TIMEOUT_MS} ms`)),
		UPSTREAM_TIMEOUT_MS
	);
	try {
		const response = await globalThis.fetch(url, {
			headers: { accept: 'application/json' },
			signal: controller.signal
		});
		if (!response.ok) throw new UpstreamError(`${url} -> ${response.status}`);
		return {
			body: (await response.json()) as T,
			totalPages: Number(response.headers.get('x-wp-totalpages') ?? 1) || 1
		};
	} finally {
		clearTimeout(timer);
	}
}

/** The directory root and the page of every active entry. */
export async function directoryUrls(origin: string): Promise<SitemapUrl[]> {
	const { body: entries } = await fetchJson<Entry[]>(`${APP_URL}/api/v2/entries`);
	return [
		{ loc: `${origin}${base}/` },
		// Active only, and strictly: the anonymous API returns inactive entries
		// too, and their pages answer 404 -- each one a sitemap error in Search
		// Console. `null` (never activated) is not active either.
		...entries.filter((entry) => entry.active === true).map((entry) => ({
			loc: `${origin}${entrySlugPageUrl(entry)}`,
			lastmod: entry.updatedAt ? new Date(entry.updatedAt).toISOString() : undefined
		}))
	];
}

const escapeXml = (s: string) =>
	s.replace(/[&<>"']/g, (c) => `&${{ '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot', "'": 'apos' }[c]};`);

export const renderSitemap = (urls: SitemapUrl[]) =>
	'<?xml version="1.0" encoding="UTF-8"?>\n' +
	'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
	urls
		.map(
			({ loc, lastmod }) =>
				`  <url><loc>${escapeXml(loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>\n`
		)
		.join('') +
	'</urlset>\n';

/**
 * The sitemap of every source, in the order given, or a 503 if any fails.
 *
 * Sources are promises already started, so they run in parallel: the sitemap
 * takes as long as its slowest source, not the sum of them.
 *
 * All or nothing. A sitemap missing half the site reads to a crawler as
 * "these pages are gone"; a 503 makes it keep the last good copy.
 */
export async function sitemapResponse(sources: Promise<SitemapUrl[]>[]): Promise<Response> {
	let urls: SitemapUrl[];
	try {
		urls = (await Promise.all(sources)).flat();
	} catch (error) {
		console.error('sitemap.xml:', (error as Error).message);
		return new Response('Sitemap temporarily unavailable', {
			status: 503,
			headers: { 'retry-after': '3600', 'content-type': 'text/plain; charset=utf-8' }
		});
	}
	return new Response(renderSitemap(urls), {
		headers: {
			'content-type': 'application/xml; charset=utf-8',
			'cache-control': 'public, max-age=3600'
		}
	});
}

/**
 * The sitemap building blocks every site's sitemap.xml route is made of: the
 * directory's own URLs, WordPress's when a site sits under one, and a response
 * that is all or nothing. Upstreams are stubbed at `fetch`.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('$app/paths', () => ({ base: '/annuaire' }));
vi.mock('$lib/utils/appUrl', () => ({ APP_URL: 'https://api.test' }));

import { directoryUrls, renderSitemap, sitemapResponse, UPSTREAM_TIMEOUT_MS } from './sitemap';
import { wordpressUrls } from './wordpress';

const ORIGIN = 'https://unipa.fr';
const API = 'https://api.test';

type Routes = Record<string, { body: unknown; totalPages?: number; status?: number }>;

const wordpress: Routes = {
	'pages&page=1': {
		body: [
			{ link: `${ORIGIN}/`, modified_gmt: '2026-09-22T07:52:21' },
			{ link: `${ORIGIN}/brouillon-test/`, modified_gmt: '2025-10-02T18:54:33' },
			{ link: `${ORIGIN}/cache/`, yoast_head_json: { robots: { index: 'noindex' } } },
			{ link: 'https://elsewhere.example/page/' }
		]
	},
	'posts&page=1': { body: [{ link: `${ORIGIN}/a/?x=1&y=2` }], totalPages: 2 },
	'posts&page=2': { body: [{ link: `${ORIGIN}/b/` }], totalPages: 2 },
	'categories&page=1': {
		body: [
			{ link: `${ORIGIN}/category/presse2024/`, count: 6 },
			{ link: `${ORIGIN}/category/uncategorized/`, count: 0 }
		]
	}
};

const ACTIVE = { entrySlug: 'horel-ipa-93', active: true, updatedAt: 1790027456687 };

interface StubOptions {
	entries?: { status?: number; body?: unknown };
	/** Never answer the entries request; reject only when it is aborted. */
	hangEntries?: boolean;
	/** Hold every response this long, to see how many are in flight at once. */
	delayMs?: number;
}

let inFlight = 0;
let maxInFlight = 0;

function stubFetch(routes: Routes, { entries = {}, hangEntries = false, delayMs = 0 }: StubOptions = {}) {
	inFlight = maxInFlight = 0;
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: string, init?: RequestInit) => {
			const url = new URL(input);
			inFlight++;
			maxInFlight = Math.max(maxInFlight, inFlight);
			try {
				if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
				if (url.href.startsWith(`${API}/api/v2/entries`)) {
					if (hangEntries) {
						return await new Promise<Response>((_, reject) =>
							init?.signal?.addEventListener('abort', () => reject(init.signal!.reason))
						);
					}
					return new Response(JSON.stringify(entries.body ?? [ACTIVE]), {
						status: entries.status ?? 200
					});
				}
				const collection = url.pathname.split('/').pop();
				const route = routes[`${collection}&page=${url.searchParams.get('page')}`];
				if (!route) return new Response('[]', { status: 404 });
				return new Response(JSON.stringify(route.body), {
					status: route.status ?? 200,
					headers: { 'x-wp-totalpages': String(route.totalPages ?? 1) }
				});
			} finally {
				inFlight--;
			}
		})
	);
}

const locsOf = (body: string) => [...body.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);

beforeEach(() => stubFetch(wordpress));
afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('directoryUrls', () => {
	it('lists the directory root and each active entry, under the base path', async () => {
		const urls = await directoryUrls(ORIGIN);
		expect(urls).toEqual([
			{ loc: `${ORIGIN}/annuaire/` },
			{ loc: `${ORIGIN}/annuaire/e/horel-ipa-93`, lastmod: '2026-09-21T21:50:56.687Z' }
		]);
	});

	/*
	 * The anonymous entries API returns inactive entries too, and their pages
	 * answer 404. Listed, every one is a sitemap error in Search Console: on
	 * 27 Sep 2026 unipa's sitemap carried five, among them one named
	 * jean-dupont-test.
	 */
	it('leaves out an entry that is not active', async () => {
		stubFetch(wordpress, {
			entries: {
				body: [
					ACTIVE,
					{ entrySlug: 'jean-dupont-test-ipa-01', active: false, updatedAt: 1 },
					{ entrySlug: 'never-activated-ipa-01', active: null, updatedAt: 1 }
				]
			}
		});
		const locs = (await directoryUrls(ORIGIN)).map((u) => u.loc);
		expect(locs).toEqual([`${ORIGIN}/annuaire/`, `${ORIGIN}/annuaire/e/horel-ipa-93`]);
	});
});

describe('wordpressUrls', () => {
	it("keeps the site's own indexable pages, following pagination", async () => {
		const locs = (await wordpressUrls(ORIGIN)).map((u) => u.loc);
		expect(locs).toEqual([
			`${ORIGIN}/`,
			`${ORIGIN}/brouillon-test/`,
			`${ORIGIN}/a/?x=1&y=2`,
			`${ORIGIN}/b/`,
			`${ORIGIN}/category/presse2024/`
		]);
	});

	it('leaves out the paths it is told to', async () => {
		const locs = (await wordpressUrls(ORIGIN, { exclude: ['/brouillon-test/'] })).map((u) => u.loc);
		expect(locs).not.toContain(`${ORIGIN}/brouillon-test/`);
	});

	it('carries lastmod as UTC', async () => {
		const [home] = await wordpressUrls(ORIGIN);
		expect(home.lastmod).toBe('2026-09-22T07:52:21Z');
	});
});

describe('renderSitemap', () => {
	it('escapes each URL', () => {
		const body = renderSitemap([{ loc: `${ORIGIN}/a/?x=1&y=2`, lastmod: '2026-01-01T00:00:00Z' }]);
		expect(body).toContain('<loc>https://unipa.fr/a/?x=1&amp;y=2</loc><lastmod>2026-01-01T00:00:00Z</lastmod>');
		expect(body.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
	});
});

describe('sitemapResponse', () => {
	it('lists every source, in order, as XML', async () => {
		const response = await sitemapResponse([wordpressUrls(ORIGIN), directoryUrls(ORIGIN)]);
		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toMatch(/^application\/xml/);
		const locs = locsOf(await response.text());
		expect(locs[0]).toBe(`${ORIGIN}/`);
		expect(locs.at(-1)).toBe(`${ORIGIN}/annuaire/e/horel-ipa-93`);
	});

	it('answers 503, not a partial sitemap, when WordPress fails', async () => {
		stubFetch({ ...wordpress, 'posts&page=2': { body: [], status: 500 } });
		const response = await sitemapResponse([wordpressUrls(ORIGIN), directoryUrls(ORIGIN)]);
		expect(response.status).toBe(503);
		expect(await response.text()).not.toContain('<urlset');
	});

	it('answers 503 when the directory API fails', async () => {
		stubFetch(wordpress, { entries: { status: 502 } });
		const response = await sitemapResponse([directoryUrls(ORIGIN)]);
		expect(response.status).toBe(503);
		expect(response.headers.get('retry-after')).toBe('3600');
	});

	it('fetches its sources in parallel, not one after another', async () => {
		stubFetch(wordpress, { delayMs: 20 });
		const response = await sitemapResponse([wordpressUrls(ORIGIN), directoryUrls(ORIGIN)]);
		expect(response.status).toBe(200);
		// pages, posts, categories and entries at once; page 2 of posts can
		// only follow page 1.
		expect(maxInFlight).toBe(4);
	});

	it('cuts an upstream off after UPSTREAM_TIMEOUT_MS, answering 503 instead of hanging', async () => {
		stubFetch(wordpress, { hangEntries: true });
		vi.useFakeTimers();
		let response: Response | undefined;
		const pending = sitemapResponse([directoryUrls(ORIGIN)]).then((r) => (response = r));

		await vi.advanceTimersByTimeAsync(UPSTREAM_TIMEOUT_MS - 1);
		expect(response).toBeUndefined();

		await vi.advanceTimersByTimeAsync(1);
		await pending;
		expect(response!.status).toBe(503);
	});
});

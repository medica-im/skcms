/**
 * What robots.txt says, per environment.
 *
 * The rule: **a dev site tells crawlers to stay out entirely; a production site
 * does not.** The dev hostnames are publicly resolvable with real certificates
 * (dev.ipa.medica.im, dev.sandbox.medica.im, …), so crawlers reach them and
 * were already probing them. `<meta name="robots" content="noindex">` in the
 * root layout keeps those pages out of search results, but it only works on
 * HTML a crawler has already fetched — it does nothing about the crawl traffic
 * itself, and nothing at all for non-HTML paths like the raw `/src/*.ts`
 * modules Vite serves in dev.
 *
 * The same flag drives both, so a site cannot end up half-hidden: VITE_NOINDEX
 * is what the layout's meta tag already reads (see $lib/utils/constants.ts).
 *
 * This is served from a route rather than a static file because `static/` is
 * copied verbatim into every build — a `Disallow: /` there would deindex
 * production the next time it shipped. Getting that backwards is expensive and
 * silent, which is what the production case below is guarding.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

/** Load the route fresh with NOINDEX forced either way. */
async function robotsFor(noindex: boolean) {
	vi.resetModules();
	vi.doMock('$lib/utils/constants', () => ({ variables: { NOINDEX: noindex } }));
	const { GET } = await import('./+server.ts');
	const response = GET();
	return {
		status: response.status,
		contentType: response.headers.get('content-type'),
		body: await response.text()
	};
}

beforeEach(() => {
	vi.resetModules();
});

describe('robots.txt on a dev site (VITE_NOINDEX=true)', () => {
	it('disallows every crawler from everything', async () => {
		const { body } = await robotsFor(true);
		expect(body).toMatch(/^User-agent:\s*\*$/m);
		expect(body).toMatch(/^Disallow:\s*\/$/m);
	});

	it('serves as plain text so crawlers parse it', async () => {
		const { status, contentType } = await robotsFor(true);
		expect(status).toBe(200);
		expect(contentType).toMatch(/^text\/plain/);
	});
});

describe('robots.txt on a production site (VITE_NOINDEX unset)', () => {
	it('never disallows the whole site', async () => {
		const { body } = await robotsFor(false);
		expect(body).not.toMatch(/^Disallow:\s*\/$/m);
	});

	it('still answers 200 as plain text rather than 404', async () => {
		const { status, contentType } = await robotsFor(false);
		expect(status).toBe(200);
		expect(contentType).toMatch(/^text\/plain/);
	});

	it('allows crawling', async () => {
		const { body } = await robotsFor(false);
		expect(body).toMatch(/^User-agent:\s*\*$/m);
		// An empty Disallow is the explicit "everything is allowed" form.
		expect(body).toMatch(/^Disallow:\s*$/m);
	});
});

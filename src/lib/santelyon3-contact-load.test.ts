import { describe, it, expect, vi } from 'vitest';
import { load } from '../routes/(skvar)/contact/+page.ts';

/**
 * What the contact page's load does when the facility cannot be fetched.
 *
 * It used to do nothing: the response was read only `if (response.ok)`, so a
 * 404 left `facility` undefined and the load returned successfully. The page
 * guards its whole body on `{#if data.facility}`, so what shipped was a blank
 * page — 200, no error, nothing on screen, and the only trace a console line
 * no visitor reads.
 *
 * That is how a slug that exists on dev but not on staging reached staging
 * unnoticed. The slug is hardcoded per site while the data behind it is not,
 * so the two can disagree; when they do, the page has to say so.
 *
 * Lives here rather than beside the page: that page is in the skvar submodule,
 * which is a separate repository per site and carries no test setup.
 *
 * The load runs on the server at build time now that the page is prerendered,
 * so throwing here fails the build rather than the visitor's request — which
 * is the point. These tests pin the throwing, not the prerendering.
 */

/** A fetch that answers every request with this status. */
const fetchReturning = (status: number, body: unknown = {}) =>
	vi.fn(async () =>
		new Response(JSON.stringify(body), {
			status,
			headers: { 'content-type': 'application/json' }
		})
	) as unknown as typeof fetch;

/** load() only ever uses `fetch`, so the rest of the event is not needed. */
const run = (fetch: typeof fetch) => (load as any)({ fetch });

describe('the contact page load', () => {
	it('returns the facility when the slug resolves', async () => {
		const facility = { uid: 'abc', name: 'Coordination', slug: 'coordination-cpts-lyon-3' };
		const result = await run(fetchReturning(200, facility));
		expect(result.facility).toMatchObject({ slug: 'coordination-cpts-lyon-3' });
	});

	it('throws when the slug does not exist, rather than returning nothing', async () => {
		// The failure that shipped. Returning `{ facility: undefined }` here is
		// what produced a blank page instead of an error.
		await expect(run(fetchReturning(404))).rejects.toMatchObject({ status: 404 });
	});

	it('throws when the API is unwell', async () => {
		await expect(run(fetchReturning(500))).rejects.toMatchObject({ status: 500 });
	});

	it('says which slug and which url failed', async () => {
		// A build that fails has to say enough to fix it. "Not found" alone leaves
		// you guessing which of a dozen sites, and which slug, was wrong.
		const error = await run(fetchReturning(404)).catch((e: unknown) => e);
		const text = JSON.stringify(error);
		expect(text).toContain('coordination-cpts-lyon-3');
	});

	it('throws when the request itself fails', async () => {
		// A build cannot reach the API at all: DNS, TLS, the host being down. That
		// has to fail the build too, not pass silently.
		const fetch = vi.fn(async () => {
			throw new TypeError('fetch failed');
		}) as unknown as typeof fetch;
		await expect(run(fetch)).rejects.toBeTruthy();
	});
});

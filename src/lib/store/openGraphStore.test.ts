import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('$lib/utils/origin.ts', () => ({ ORIGIN: 'https://site.test' }));

import { getOpenGraph } from './openGraphStore';

/**
 * The site's sharing card (/api/v1/opengraph/), for the pages that set their
 * OpenGraph tags from it.
 *
 * A site without a card is a normal state, answered 404: the page renders
 * without the tags, and nothing is logged. It used to log an error, which
 * check-staging.sh then reported as a broken page on every site without one.
 *
 * Through the load function's fetch when a page passes it: SvelteKit replays
 * that response during hydration instead of asking again from the browser.
 */

const reply = (status: number, body: unknown = {}) =>
	vi.fn(async () => new Response(JSON.stringify(body), { status }));

afterEach(() => vi.restoreAllMocks());

describe('getOpenGraph', () => {
	it('returns the card', async () => {
		const card = { title: 'Maison de santé' };
		expect(await getOpenGraph(reply(200, card))).toEqual(card);
	});

	it('asks the site through the fetch it is given', async () => {
		const fetch = reply(200);
		await getOpenGraph(fetch);
		expect(fetch).toHaveBeenCalledWith('https://site.test/api/v1/opengraph/');
	});

	it('returns nothing, and logs nothing, for a site without a card', async () => {
		const log = vi.spyOn(console, 'error').mockImplementation(() => {});
		expect(await getOpenGraph(reply(404))).toBeUndefined();
		expect(log).not.toHaveBeenCalled();
	});

	it('still logs a failure that is not a missing card', async () => {
		const log = vi.spyOn(console, 'error').mockImplementation(() => {});
		expect(await getOpenGraph(reply(500))).toBeUndefined();
		expect(log).toHaveBeenCalled();
	});
});

/**
 * The map a user clicks to place a facility.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import AddMarkerMap from './AddMarkerMap.svelte';

const OSM_TILE = /^https:\/\/tile\.openstreetmap\.org\/\d+\/\d+\/\d+\.png$/;

const externalRequests = () => {
	const urls: string[] = [];
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: RequestInfo | URL) => {
			const url = input instanceof Request ? input.url : String(input);
			if (new URL(url, location.href).origin !== location.origin) urls.push(url);
			return new Response(null, { status: 404 });
		})
	);
	return urls;
};

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('AddMarkerMap', () => {
	it('draws the standard OpenStreetMap tiles, whose shops and house numbers help place the pin', async () => {
		const urls = externalRequests();
		render(AddMarkerMap, { lng: 4.8723, lat: 45.7461, zoom: 17 });

		await vi.waitFor(() => expect(urls.some((url) => OSM_TILE.test(url))).toBe(true), {
			timeout: 10_000
		});
		expect(urls.filter((url) => !OSM_TILE.test(url))).toEqual([]);
	});
});

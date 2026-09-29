/**
 * The geocoder when the address service fails.
 *
 * api-adresse.data.gouv.fr is a public service we don't run; it answered
 * 504 on dev.unipa.fr (29 Sep 2026) and the page showed nothing at all -- the
 * error went to the console only, and an empty list looks like a broken
 * layout. A failure must be said under the field, and forgotten once a
 * search works again.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import '../../../app.postcss';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { writable } from 'svelte/store';
import * as m from '$msgs';

vi.mock('$app/state', () => ({
	page: { url: new URL('https://example.org/'), data: {} }
}));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('../Directory/context', () => {
	const addressFeature = writable(null);
	const inputAddress = writable(null);
	return {
		getAddressFeature: () => addressFeature,
		getGeoInputAddress: () => inputAddress
	};
});

import Geocoder from './Geocoder.svelte';

const answering = (status: number, body: unknown = { features: [] }) =>
	vi.fn(async () => new Response(JSON.stringify(body), { status }));

afterEach(() => {
	vi.unstubAllGlobals();
});

async function search(text: string) {
	const input = page.getByRole('searchbox');
	await input.fill(text);
}

describe('Geocoder, when the address service fails', () => {
	it('says so when the service answers an error', async () => {
		vi.stubGlobal('fetch', answering(504));
		render(Geocoder, { limitToZip: false });

		await search('2 rue de Andelaroche');

		await expect.element(page.getByRole('alert')).toHaveTextContent(m.ADDRESSBOOK_GEOCODER_UNAVAILABLE());
	});

	it('says so when the service cannot be reached', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				throw new TypeError('Failed to fetch');
			})
		);
		render(Geocoder, { limitToZip: false });

		await search('2 rue de Andelaroche');

		await expect.element(page.getByRole('alert')).toBeInTheDocument();
	});

	it('forgets the failure once a search works again', async () => {
		const fetchFn = answering(504);
		vi.stubGlobal('fetch', fetchFn);
		render(Geocoder, { limitToZip: false });
		await search('2 rue de Andelaroche');
		await expect.element(page.getByRole('alert')).toBeInTheDocument();

		fetchFn.mockImplementation(async () => new Response(JSON.stringify({ features: [] }), { status: 200 }));
		await search('2 rue de Andelaroches');

		await expect.element(page.getByRole('alert')).not.toBeInTheDocument();
	});
});

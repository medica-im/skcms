import { describe, it, expect, vi } from 'vitest';
import { peerBasePath } from './peerBasePath.ts';

/**
 * Where a peer serves its pages, as the peer states it in /api/v2/organization.
 *
 * The registry holds origins only, and the peer's API answers at the root of
 * its domain whatever its base path: so the page links of the clone wizard need
 * the peer's own answer. Anything that is not a plain path is unknown rather
 * than passed on, since the value ends up in a link the browser follows.
 */
const answering = (body: unknown, status = 200) =>
	vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify(body), { status }));

describe('the base path of a peer', () => {
	it('is read from the peer’s own organization', async () => {
		const fetch = answering({ base_path: '/annuaire' });

		expect(await peerBasePath('https://unipa.fr', fetch)).toBe('/annuaire');
		expect(fetch.mock.calls[0][0]).toBe('https://unipa.fr/api/v2/organization');
	});

	it('is empty for a peer served at its root', async () => {
		expect(await peerBasePath('https://santelyon3.fr/', answering({ base_path: '' }))).toBe('');
	});

	it('is unknown for a peer that does not state one, not assumed to be its root', async () => {
		expect(await peerBasePath('https://santelyon3.fr', answering({ name: 'an organization' }))).toBeNull();
	});

	it.each(['//evil.example', 'https://evil.example/x', '/a/../b', '/a b', 'annuaire', '/a?x=1', 5, null])(
		'is unknown when what the peer states is not a plain path: %s',
		async (stated) => {
			expect(await peerBasePath('https://unipa.fr', answering({ base_path: stated }))).toBeNull();
		}
	);

	it('is unknown when the peer errors', async () => {
		expect(await peerBasePath('https://unipa.fr', answering({}, 503))).toBeNull();
	});

	it('is unknown when the peer redirects, which is never followed', async () => {
		const fetch = vi.fn(async (_url: string, _init?: RequestInit) => new Response(null, { status: 301 }));

		expect(await peerBasePath('https://unipa.fr', fetch)).toBeNull();
		expect(fetch.mock.calls[0][1]).toMatchObject({ redirect: 'manual' });
	});

	it('is unknown when the peer cannot be reached', async () => {
		const fetch = vi.fn(async () => {
			throw new TypeError('fetch failed');
		});

		expect(await peerBasePath('https://unipa.fr', fetch)).toBeNull();
	});

	it('is unknown when the answer is not JSON', async () => {
		const fetch = vi.fn(async () => new Response('<html></html>', { status: 200 }));

		expect(await peerBasePath('https://unipa.fr', fetch)).toBeNull();
	});
});

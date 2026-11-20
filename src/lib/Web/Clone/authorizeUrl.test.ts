import { describe, it, expect } from 'vitest';
import { authorizeUrl } from './authorizeUrl.ts';

/**
 * The link from the clone wizard to the source's consent page.
 *
 * A peer is known by its origin alone, and the page is served under the peer's
 * own base path: the wizard cannot take its own. From a site at its root,
 * https://unipa.fr/web/clone/authorize is WordPress; from unipa, every other
 * peer is not at /annuaire.
 */
const wizard = {
	target: 'https://staging.annuaire.medica.im',
	back: '/web/clone/callback',
	instance: 'unipa-prod'
};

const query = (url: string) => new URL(url).searchParams;

describe('the consent page of a peer', () => {
	it('is under the base path the peer states, not the wizard’s own', () => {
		const url = authorizeUrl({
			...wizard,
			peerOrigin: 'https://unipa.fr',
			peerBasePath: '/annuaire',
			ownBasePath: ''
		});

		expect(url.startsWith('https://unipa.fr/annuaire/web/clone/authorize?')).toBe(true);
	});

	it('is at the root of a peer that serves its pages there, whatever the wizard’s base path', () => {
		const url = authorizeUrl({
			...wizard,
			peerOrigin: 'https://santelyon3.fr',
			peerBasePath: '',
			ownBasePath: '/annuaire'
		});

		expect(url.startsWith('https://santelyon3.fr/web/clone/authorize?')).toBe(true);
	});

	it('assumes the wizard’s own base path for a peer that could not say', () => {
		const url = authorizeUrl({
			...wizard,
			peerOrigin: 'https://unipa.fr',
			peerBasePath: null,
			ownBasePath: '/annuaire'
		});

		expect(url.startsWith('https://unipa.fr/annuaire/web/clone/authorize?')).toBe(true);
	});

	it('does not double the slash when the registry stores the origin with one', () => {
		const url = authorizeUrl({
			...wizard,
			peerOrigin: 'https://unipa.fr/',
			peerBasePath: '/annuaire',
			ownBasePath: ''
		});

		expect(url.startsWith('https://unipa.fr/annuaire/web/clone/authorize?')).toBe(true);
	});

	it('says where to come back to and who is asking', () => {
		const url = authorizeUrl({
			...wizard,
			peerOrigin: 'https://unipa.fr',
			peerBasePath: '/annuaire',
			ownBasePath: ''
		});

		expect(Object.fromEntries(query(url))).toEqual({
			target: 'https://staging.annuaire.medica.im',
			return: '/web/clone/callback',
			instance: 'unipa-prod'
		});
	});

	it('names the directory only when one was chosen', () => {
		const base = {
			...wizard,
			peerOrigin: 'https://unipa.fr',
			peerBasePath: '',
			ownBasePath: ''
		};

		expect(query(authorizeUrl({ ...base, directory: 'cpts lyon & co' })).get('directory')).toBe(
			'cpts lyon & co'
		);
		expect(query(authorizeUrl(base)).has('directory')).toBe(false);
		expect(query(authorizeUrl({ ...base, directory: '' })).has('directory')).toBe(false);
	});
});

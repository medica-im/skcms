import { describe, it, expect } from 'vitest';
import { signinRedirectTo } from './signinRedirect';
import { authorizeUrl } from '#lib/Web/Clone/authorizeUrl.ts';

/**
 * Where the signin page sends the user once signed in.
 *
 * The guards pass the page they protect as `redirectTo`, already percent-encoded:
 * a pathname is, and the clone consent page adds its query string, whose values
 * URLSearchParams encoded. The signin page once ran encodeURI over it again,
 * which turns every '%' into '%25'. A plain path has none, so nothing showed until
 * the clone flow: signing in on dev.sante-gadagne.fr to clone towards staging
 * landed on a consent page whose target read 'https%3A%2F%2Fstaging…' and was
 * refused as "not a valid origin".
 */

describe('signinRedirectTo', () => {
	it('keeps the page asked for as it is', () => {
		expect(signinRedirectTo('/web/entries', '/dashboard')).toBe('/web/entries');
	});

	it('falls back when no page was asked for', () => {
		expect(signinRedirectTo(null, '/dashboard')).toBe('/dashboard');
		expect(signinRedirectTo('', '/dashboard')).toBe('/dashboard');
	});

	it('brings the clone consent page back with its target intact', () => {
		const consent = new URL(
			authorizeUrl({
				peerOrigin: 'https://dev.sante-gadagne.fr',
				peerBasePath: '',
				ownBasePath: '',
				target: 'https://staging.sante-gadagne.fr',
				back: '/web/clone/callback',
				instance: 'sante-gadagne-dev',
				directory: 'gadagne'
			})
		);
		// What the consent page's guard sends to signin, and what signin reads back.
		const signin = new URL(
			`https://dev.sante-gadagne.fr/signin?redirectTo=${encodeURIComponent(`${consent.pathname}${consent.search}`)}`
		);
		const after = new URL(
			signinRedirectTo(signin.searchParams.get('redirectTo'), '/dashboard'),
			consent.origin
		);

		expect(after.pathname).toBe('/web/clone/authorize');
		expect(after.searchParams.get('target')).toBe('https://staging.sante-gadagne.fr');
		expect(after.searchParams.get('return')).toBe('/web/clone/callback');
		expect(after.searchParams.get('instance')).toBe('sante-gadagne-dev');
		expect(after.searchParams.get('directory')).toBe('gadagne');
	});
});

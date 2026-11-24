import { describe, it, expect } from 'vitest';
import { hasNetworkChange } from '../../tests/sites/networkChange';

/**
 * Chrome fails the requests in flight with ERR_NETWORK_CHANGED whenever an
 * interface or address of the machine running it changes. The staging check runs
 * on a box with a dozen docker bridges, so a container started or stopped
 * anywhere while it browses fails a page that was fine: staging.ipa.medica.im
 * and staging.msp.medica.im, 2026-11-24, 200 a moment later.
 *
 * Whether a page's errors are that is the one decision here; reloading the page
 * once is the caller's, and the second load stands on its own: a real error comes
 * back with it.
 */

describe('hasNetworkChange', () => {
	it('is true when a request failed because the network changed', () => {
		expect(
			hasNetworkChange([
				'console: Failed to load resource: net::ERR_NETWORK_CHANGED (https://staging.unipa.fr/api/v2/entries)'
			])
		).toBe(true);
	});

	it('is true when its consequences, a failed fetch in the app, come with it', () => {
		expect(
			hasNetworkChange([
				'console: Failed to load resource: net::ERR_NETWORK_CHANGED (https://staging.unipa.fr/api/v2/entries)',
				'console: There was an error while retrieving entries from layout.ts Failed to fetch'
			])
		).toBe(true);
	});

	it('is true when the navigation itself was cut', () => {
		expect(
			hasNetworkChange([
				'navigation: page.goto: net::ERR_NETWORK_CHANGED at https://staging.unipa.fr/'
			])
		).toBe(true);
	});

	it('is false for any other error', () => {
		expect(hasNetworkChange(['HTTP 500'])).toBe(false);
		expect(hasNetworkChange(['exception: x is not defined'])).toBe(false);
		expect(
			hasNetworkChange([
				'console: Failed to load resource: net::ERR_CONNECTION_REFUSED (https://a/b)'
			])
		).toBe(false);
	});

	it('is false for a page with no error', () => {
		expect(hasNetworkChange([])).toBe(false);
	});
});

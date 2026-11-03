/**
 * The open tab of the invitation email page lives in the address (?tab=...), so
 * that a reload opens the tab the browser has checked. The address is always
 * computed from the one the browser shows -- SvelteKit's replaceState does not
 * update page.url, so reading that gave "nothing to change" when going back to
 * the first tab, and ?tab=preview stayed.
 */
import { describe, it, expect } from 'vitest';
import { tabFromAddress, addressForTab } from './tabAddress';

const PAGE = 'https://dev.msp-vedene.fr/web/invite/email-template';

describe('tabFromAddress', () => {
	it('opens the content when the address names no tab', () => {
		expect(tabFromAddress('')).toBe(0);
	});

	it.each([
		['?tab=template', 0],
		['?tab=preview', 1],
		['?tab=images', 2]
	])('reads %s', (search, tab) => {
		expect(tabFromAddress(search)).toBe(tab);
	});

	it('opens the content on a tab it does not know', () => {
		expect(tabFromAddress('?tab=nonsense')).toBe(0);
	});
});

describe('addressForTab', () => {
	it('names the preview and the images', () => {
		expect(addressForTab(PAGE, 1)).toBe(`${PAGE}?tab=preview`);
		expect(addressForTab(PAGE, 2)).toBe(`${PAGE}?tab=images`);
	});

	it('leaves the first tab out of the address', () => {
		expect(addressForTab(`${PAGE}?tab=preview`, 0)).toBe(PAGE);
	});

	it('moves from one tab to another', () => {
		expect(addressForTab(`${PAGE}?tab=preview`, 2)).toBe(`${PAGE}?tab=images`);
	});

	it('keeps what else the address holds', () => {
		expect(addressForTab(`${PAGE}?lang=fr&tab=preview#top`, 0)).toBe(`${PAGE}?lang=fr#top`);
		expect(addressForTab(`${PAGE}?lang=fr`, 1)).toBe(`${PAGE}?lang=fr&tab=preview`);
	});

	it('is the address itself when the tab already agrees', () => {
		expect(addressForTab(PAGE, 0)).toBe(PAGE);
		expect(addressForTab(`${PAGE}?tab=images`, 2)).toBe(`${PAGE}?tab=images`);
	});
});

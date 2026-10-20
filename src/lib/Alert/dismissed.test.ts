/**
 * The alerts a visitor has closed, kept in a cookie so the server knows them:
 * it renders an alert for everyone else and leaves it out for them, and the
 * page never moves when it hydrates. (Kept in localStorage, an alert could
 * only be rendered in the browser, after the first paint, pushing the page
 * down for every visitor.)
 */
import { describe, expect, it } from 'vitest';
import { DISMISSED_COOKIE, dismissedCookie, parseDismissed } from './dismissed';

describe('parseDismissed', () => {
	it('reads the ids from the cookie', () => {
		expect(parseDismissed('association-alert-v1,heatwave')).toEqual(['association-alert-v1', 'heatwave']);
	});

	it('reads no cookie, or an empty one, as nothing closed', () => {
		expect(parseDismissed(undefined)).toEqual([]);
		expect(parseDismissed('')).toEqual([]);
	});
});

describe('dismissedCookie', () => {
	it('adds the alert to those already closed, for a year, on every page', () => {
		expect(dismissedCookie(['heatwave'], 'association-alert-v1', true)).toBe(
			`${DISMISSED_COOKIE}=heatwave,association-alert-v1; Path=/; Max-Age=31536000; SameSite=Lax; Secure`
		);
	});

	it('lists an alert once, however often it is closed', () => {
		expect(dismissedCookie(['a'], 'a', false)).toBe(`${DISMISSED_COOKIE}=a; Path=/; Max-Age=31536000; SameSite=Lax`);
	});
});

/**
 * Dates in ordered lists, written for scanning: relative while recent
 * ("Il y a 5 minutes", "Aujourd’hui, 14:30", "Hier, 09:05"), absolute once
 * older ("24 oct. 2026"). The exact moment is always available in full, for a
 * tooltip. Built on Intl only, in the reader's locale.
 *
 * "Now" is passed in, so these tests do not depend on the clock; dates are
 * built in local time, as the formatter reads calendar days in local time.
 */
import { describe, it, expect } from 'vitest';
import { formatListDateTime, formatFullDateTime } from './dateTimeFormat';

const now = new Date(2026, 8, 28, 16, 0); // 28 Sep 2026, 16:00 local
const at = (d: number, h: number, m: number) => new Date(2026, 8, d, h, m).getTime();
const fr = (value: Parameters<typeof formatListDateTime>[0]) => formatListDateTime(value, { locale: 'fr', now });

describe('formatListDateTime', () => {
	it('says "now" for the last minute', () => {
		expect(fr(now.getTime() - 20_000)).toBe('Maintenant');
	});

	it('counts minutes within the last hour', () => {
		expect(fr(now.getTime() - 5 * 60_000)).toBe('Il y a 5 minutes');
	});

	it('gives the time for earlier today', () => {
		expect(fr(at(28, 14, 30))).toBe('Aujourd’hui, 14:30');
	});

	it('gives the time for yesterday', () => {
		expect(fr(at(27, 9, 5))).toBe('Hier, 09:05');
	});

	it('gives the date for anything older', () => {
		expect(fr(new Date(2026, 9, 24, 10, 0).getTime() - 365 * 86_400_000)).toBe('24 oct. 2025');
		expect(fr(at(20, 11, 0))).toBe('20 sept. 2026');
	});

	it('gives the date for a date in the future beyond a minute', () => {
		expect(fr(at(30, 9, 0))).toBe('30 sept. 2026');
	});

	it('reads milliseconds, ISO strings and Dates alike', () => {
		const ms = at(28, 14, 30);
		expect(fr(new Date(ms).toISOString())).toBe('Aujourd’hui, 14:30');
		expect(fr(new Date(ms))).toBe('Aujourd’hui, 14:30');
	});

	it('is null when there is no date, for the caller to show a dash', () => {
		expect(fr(null)).toBeNull();
		expect(fr(undefined)).toBeNull();
	});

	it('follows the locale', () => {
		expect(formatListDateTime(now.getTime() - 5 * 60_000, { locale: 'en', now })).toBe('5 minutes ago');
		expect(formatListDateTime(at(27, 9, 5), { locale: 'en', now })).toMatch(/^Yesterday, 9:05\sAM$/);
	});
});

describe('formatFullDateTime', () => {
	it('writes the exact moment out, for the tooltip', () => {
		expect(formatFullDateTime(at(28, 14, 30), 'fr')).toBe('lundi 28 septembre 2026 à 14:30');
	});

	it('is null when there is no date', () => {
		expect(formatFullDateTime(null, 'fr')).toBeNull();
	});
});

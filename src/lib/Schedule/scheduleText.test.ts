import { describe, expect, test } from 'vitest';
import { describeChange, formatDays, formatPeriods } from './scheduleText.ts';
import { isoDayAt } from './openingHours.ts';

const p = (opens: string, closes: string) => ({ opens, closes });

describe('formatPeriods', () => {
	test('one period', () => {
		expect(formatPeriods([p('08:00', '20:00')])).toBe('08:00–20:00');
	});

	test('two periods are joined with "et"', () => {
		expect(formatPeriods([p('08:00', '12:00'), p('14:00', '18:00')])).toBe('08:00–12:00 et 14:00–18:00');
	});

	test('three periods are a list ending with "et"', () => {
		expect(formatPeriods([p('08:00', '12:00'), p('14:00', '18:00'), p('19:00', '21:00')])).toBe(
			'08:00–12:00, 14:00–18:00 et 19:00–21:00'
		);
	});

	test('a whole day is "24h/24"', () => {
		expect(formatPeriods([p('00:00', '24:00')])).toBe('24h/24');
	});
});

describe('formatDays', () => {
	test.each([
		[1, 1, 'Lundi'],
		[1, 2, 'Lundi et mardi'],
		[1, 5, 'Lundi au vendredi'],
		[6, 7, 'Samedi et dimanche'],
		[1, 7, 'Tous les jours']
	] as const)('%i to %i reads "%s"', (from, to, text) => {
		expect(formatDays(from, to)).toBe(text);
	});
});

describe('describeChange', () => {
	test('closing later today', () => {
		expect(describeChange({ opens: false, isoDay: 1, time: '12:00', daysAhead: 0 })).toBe('ferme à 12:00');
	});

	test('closing at midnight', () => {
		expect(describeChange({ opens: false, isoDay: 1, time: '24:00', daysAhead: 0 })).toBe('ferme à minuit');
	});

	test('opening later today', () => {
		expect(describeChange({ opens: true, isoDay: 1, time: '14:00', daysAhead: 0 })).toBe('ouvre à 14:00');
	});

	test('opening tomorrow', () => {
		expect(describeChange({ opens: true, isoDay: 2, time: '08:45', daysAhead: 1 })).toBe('ouvre demain à 08:45');
	});

	test('opening further ahead names the day', () => {
		expect(describeChange({ opens: true, isoDay: 1, time: '08:45', daysAhead: 3 })).toBe('ouvre lundi à 08:45');
	});

	test('no change at all is no sentence', () => {
		expect(describeChange(null)).toBeNull();
	});
});

describe('isoDayAt', () => {
	test('is the weekday of the place, not of the viewer', () => {
		const instant = new Date('2026-11-03T00:30:00Z');
		expect(isoDayAt(instant, 'Europe/Paris')).toBe(2);
		expect(isoDayAt(instant, 'America/New_York')).toBe(1);
	});
});

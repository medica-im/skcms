import { describe, expect, test } from 'vitest';
import { isOpen, nextChange, summarize, type OpeningSchedule } from './openingHours.ts';

const PARIS = 'Europe/Paris';
const NEW_YORK = 'America/New_York';

const closedWeek = (): OpeningSchedule => ({
	days: { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] },
	holidays: 'closed'
});

const week = (days: Partial<OpeningSchedule['days']>, holidays: 'closed' | 'open' = 'closed'): OpeningSchedule => ({
	days: { ...closedWeek().days, ...days },
	holidays
});

const p = (opens: string, closes: string) => ({ opens, closes });

const noHolidays = {};
const christmas2026 = { '2026-12-25': 'Noël' };

describe('isOpen', () => {
	test('a minute inside a period that starts at a quarter past is open', () => {
		const s = week({ 1: [p('08:45', '12:00')] });
		// Monday 2026-11-02, Paris is UTC+1
		expect(isOpen(s, new Date('2026-11-02T08:30:00Z'), noHolidays, PARIS)).toBe(true);
	});

	test('a period includes its opening minute and excludes its closing minute', () => {
		const s = week({ 1: [p('08:45', '12:00')] });
		expect(isOpen(s, new Date('2026-11-02T07:44:00Z'), noHolidays, PARIS)).toBe(false);
		expect(isOpen(s, new Date('2026-11-02T07:45:00Z'), noHolidays, PARIS)).toBe(true);
		expect(isOpen(s, new Date('2026-11-02T10:59:00Z'), noHolidays, PARIS)).toBe(true);
		expect(isOpen(s, new Date('2026-11-02T11:00:00Z'), noHolidays, PARIS)).toBe(false);
	});

	test('a day with several periods is closed between them', () => {
		const s = week({ 1: [p('08:00', '12:00'), p('14:00', '18:00')] });
		expect(isOpen(s, new Date('2026-11-02T11:30:00Z'), noHolidays, PARIS)).toBe(false);
		expect(isOpen(s, new Date('2026-11-02T13:00:00Z'), noHolidays, PARIS)).toBe(true);
	});

	test('a day without any period is closed', () => {
		const s = week({ 1: [p('08:00', '20:00')] });
		expect(isOpen(s, new Date('2026-11-03T10:00:00Z'), noHolidays, PARIS)).toBe(false);
	});

	test('24:00 closes at midnight, and the next day is judged on its own periods', () => {
		const s = week({ 1: [p('00:00', '24:00')] });
		expect(isOpen(s, new Date('2026-11-02T22:59:00Z'), noHolidays, PARIS)).toBe(true);
		expect(isOpen(s, new Date('2026-11-02T23:00:00Z'), noHolidays, PARIS)).toBe(false);
	});

	test('the weekday and the time are those of the place, not those of the viewer', () => {
		const s = week({ 2: [p('00:00', '24:00')] });
		// Tuesday 01:30 in Paris is still Monday 19:30 in New York
		const instant = new Date('2026-11-03T00:30:00Z');
		expect(isOpen(s, instant, noHolidays, PARIS)).toBe(true);
		expect(isOpen(s, instant, noHolidays, NEW_YORK)).toBe(false);
	});

	test('on the day clocks go forward, hours follow the local clock', () => {
		const s = week({ 7: [p('08:00', '20:00')] });
		// Sunday 2026-03-29: Paris moves from UTC+1 to UTC+2 at 01:00Z
		expect(isOpen(s, new Date('2026-03-29T05:30:00Z'), noHolidays, PARIS)).toBe(false);
		expect(isOpen(s, new Date('2026-03-29T06:30:00Z'), noHolidays, PARIS)).toBe(true);
	});

	describe('public holidays', () => {
		const friday = { 5: [p('08:00', '18:00')] };

		test('a service that closes on holidays is closed on one', () => {
			expect(isOpen(week(friday, 'closed'), new Date('2026-12-25T09:00:00Z'), christmas2026, PARIS)).toBe(false);
		});

		test('a service that stays open on holidays follows its weekly hours', () => {
			expect(isOpen(week(friday, 'open'), new Date('2026-12-25T09:00:00Z'), christmas2026, PARIS)).toBe(true);
		});

		test('an ordinary Friday is unaffected by the holiday setting', () => {
			expect(isOpen(week(friday, 'closed'), new Date('2026-12-18T09:00:00Z'), christmas2026, PARIS)).toBe(true);
		});

		test('the holiday is looked up on the local date, not the UTC one', () => {
			const s = week({ 5: [p('00:00', '24:00')] }, 'closed');
			// 2026-12-24T23:30Z is already 25 December in Paris
			expect(isOpen(s, new Date('2026-12-24T23:30:00Z'), christmas2026, PARIS)).toBe(false);
		});
	});
});

describe('nextChange', () => {
	const s = week({
		1: [p('08:45', '12:00'), p('14:00', '18:00')],
		2: [p('08:45', '12:00'), p('14:00', '18:00')],
		5: [p('08:45', '12:00'), p('14:00', '18:00')]
	});

	test('while open, it names the closing time', () => {
		const at = new Date('2026-11-02T08:30:00Z'); // Monday 09:30
		expect(nextChange(s, at, noHolidays, PARIS)).toEqual({ opens: false, isoDay: 1, time: '12:00', daysAhead: 0 });
	});

	test('between two periods, it names the next opening the same day', () => {
		const at = new Date('2026-11-02T11:30:00Z'); // Monday 12:30
		expect(nextChange(s, at, noHolidays, PARIS)).toEqual({ opens: true, isoDay: 1, time: '14:00', daysAhead: 0 });
	});

	test('after the last period of the week, it names the next open day', () => {
		const at = new Date('2026-11-06T17:30:00Z'); // Friday 18:30
		expect(nextChange(s, at, noHolidays, PARIS)).toEqual({ opens: true, isoDay: 1, time: '08:45', daysAhead: 3 });
	});

	test('a holiday that closes the service is skipped', () => {
		const at = new Date('2026-11-06T17:30:00Z'); // Friday 18:30
		const holidays = { '2026-11-09': 'Jour férié' };
		expect(nextChange(s, at, holidays, PARIS)).toEqual({ opens: true, isoDay: 2, time: '08:45', daysAhead: 4 });
	});

	test('periods that meet at midnight count as one: the change is where they end', () => {
		const night = week({ 1: [p('18:00', '24:00')], 2: [p('00:00', '08:00')] });
		const at = new Date('2026-11-02T18:00:00Z'); // Monday 19:00
		expect(nextChange(night, at, noHolidays, PARIS)).toEqual({ opens: false, isoDay: 2, time: '08:00', daysAhead: 1 });
	});

	test('a service that never closes has no next change', () => {
		const always = week({ 1: [p('00:00', '24:00')], 2: [p('00:00', '24:00')], 3: [p('00:00', '24:00')], 4: [p('00:00', '24:00')], 5: [p('00:00', '24:00')], 6: [p('00:00', '24:00')], 7: [p('00:00', '24:00')] }, 'open');
		expect(nextChange(always, new Date('2026-11-02T10:00:00Z'), noHolidays, PARIS)).toBeNull();
	});

	test('a service that never opens has no next change', () => {
		expect(nextChange(closedWeek(), new Date('2026-11-02T10:00:00Z'), noHolidays, PARIS)).toBeNull();
	});
});

describe('summarize', () => {
	test('consecutive days with the same periods form one group', () => {
		const hours = [p('08:00', '12:00'), p('14:00', '18:00')];
		const s = week({ 1: hours, 2: hours, 3: hours, 4: hours, 5: hours });
		expect(summarize(s)).toEqual([{ from: 1, to: 5, periods: hours }]);
	});

	test('a different day starts a new group and closed days are left out', () => {
		const long = [p('08:00', '20:00')];
		const short = [p('09:00', '12:00')];
		const s = week({ 1: long, 2: long, 3: long, 6: short });
		expect(summarize(s)).toEqual([
			{ from: 1, to: 3, periods: long },
			{ from: 6, to: 6, periods: short }
		]);
	});

	test('days with the same periods that are not neighbours stay apart', () => {
		const hours = [p('08:00', '12:00')];
		const s = week({ 1: hours, 3: hours });
		expect(summarize(s)).toEqual([
			{ from: 1, to: 1, periods: hours },
			{ from: 3, to: 3, periods: hours }
		]);
	});

	test('a schedule with no open day has no groups', () => {
		expect(summarize(closedWeek())).toEqual([]);
	});
});

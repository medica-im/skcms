import { describe, expect, test } from 'vitest';
import type { OpeningSchedule } from './openingHours.ts';
import { nowOffset, weekRows } from './weekRows.ts';

const closedWeek = (): OpeningSchedule => ({
	days: { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] },
	holidays: 'closed'
});

const week = (days: Partial<OpeningSchedule['days']>): OpeningSchedule => ({
	days: { ...closedWeek().days, ...days },
	holidays: 'closed'
});

const p = (opens: string, closes: string) => ({ opens, closes });

const frontDesk = [p('08:30', '11:00'), p('14:00', '17:00')];
const weekdays = (periods: ReturnType<typeof p>[]) => ({
	1: periods,
	2: periods,
	3: periods,
	4: periods,
	5: periods
});

describe('weekRows', () => {
	test('a week with no period has nothing to draw', () => {
		expect(weekRows(closedWeek())).toBeNull();
	});

	test('the axis runs from the hour before the earliest opening to the hour after the latest closing', () => {
		const layout = weekRows(week({ 1: [p('09:00', '11:00')], 3: [p('08:30', '11:00'), p('14:00', '16:15')] }))!;
		expect(layout.start).toBe(8 * 60);
		expect(layout.end).toBe(17 * 60);
	});

	test('an axis already on the hour is not widened', () => {
		const layout = weekRows(week({ 1: [p('09:00', '17:00')] }))!;
		expect([layout.start, layout.end]).toEqual([9 * 60, 17 * 60]);
	});

	test('the axis has a tick on every hour, both ends included', () => {
		const layout = weekRows(week(weekdays(frontDesk)))!;
		expect(layout.ticks).toEqual([8, 9, 10, 11, 12, 13, 14, 15, 16, 17]);
	});

	test('every day of the week has a row, Monday first, and a closed day has no block', () => {
		const layout = weekRows(week(weekdays(frontDesk)))!;
		expect(layout.rows.map((row) => row.isoDay)).toEqual([1, 2, 3, 4, 5, 6, 7]);
		expect(layout.rows[5].blocks).toEqual([]);
		expect(layout.rows[6].blocks).toEqual([]);
	});

	test('a block sits on the axis as a share of its width and keeps its times', () => {
		const layout = weekRows(week(weekdays(frontDesk)))!;
		const [morning, afternoon] = layout.rows[0].blocks;
		// The axis is 8:00-17:00: 540 minutes.
		expect(morning.opens).toBe('08:30');
		expect(morning.closes).toBe('11:00');
		expect(morning.left).toBeCloseTo((30 / 540) * 100);
		expect(morning.width).toBeCloseTo((150 / 540) * 100);
		expect(afternoon.left + afternoon.width).toBeCloseTo(100);
	});

	test('a period that closes at midnight ends the axis at 24:00', () => {
		const layout = weekRows(week({ 6: [p('20:00', '24:00')] }))!;
		expect(layout.end).toBe(24 * 60);
		expect(layout.ticks.at(-1)).toBe(24);
		expect(layout.rows[5].blocks[0].width).toBeCloseTo(100);
	});
});

describe('nowOffset', () => {
	const layout = weekRows(week(weekdays(frontDesk)))!;

	test('a time on the axis is placed as a share of its width', () => {
		expect(nowOffset(layout, 12 * 60 + 30)).toBeCloseTo((270 / 540) * 100);
	});

	test('the ends of the axis are on it', () => {
		expect(nowOffset(layout, 8 * 60)).toBe(0);
		expect(nowOffset(layout, 17 * 60)).toBe(100);
	});

	test('a time off the axis has no place on it', () => {
		expect(nowOffset(layout, 7 * 60 + 59)).toBeNull();
		expect(nowOffset(layout, 17 * 60 + 1)).toBeNull();
	});
});

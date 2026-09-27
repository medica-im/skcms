/**
 * One ordering for every date column in the frontend.
 *
 * Three lists sorted by date, each its own way: the admin entries table
 * (milliseconds), the owner picker (milliseconds, missing dates read as 1970)
 * and the invitations list (ISO strings). They disagreed on where an undated
 * row goes. The rule here: newest or oldest first as asked, and a row with no
 * date LAST either way -- it answers neither question.
 */
import { describe, it, expect } from 'vitest';
import { compareDateTimes, sortByDateTime, toTime } from './dateTimeSort';

const row = (id: string, date: number | string | Date | null | undefined) => ({ id, date });
const ids = (list: { id: string }[]) => list.map((r) => r.id);
const byDate = (r: { date: unknown }) => r.date as never;

describe('toTime', () => {
	it('reads milliseconds, ISO strings and Dates alike', () => {
		const ms = Date.parse('2026-09-27T10:02:19.672Z');
		expect(toTime(ms)).toBe(ms);
		expect(toTime('2026-09-27T10:02:19.672Z')).toBe(ms);
		expect(toTime(new Date(ms))).toBe(ms);
	});

	it('is null for a missing or unreadable date', () => {
		expect(toTime(null)).toBeNull();
		expect(toTime(undefined)).toBeNull();
		expect(toTime('')).toBeNull();
		expect(toTime('not a date')).toBeNull();
	});
});

describe('sortByDateTime', () => {
	const march = row('march', '2026-03-01T10:00:00Z');
	const september = row('september', Date.parse('2026-09-27T10:02:19Z'));
	const june = row('june', new Date('2026-06-15T08:30:00Z'));
	const undated = row('undated', null);

	it('puts the newest first when descending, whatever the date type', () => {
		expect(ids(sortByDateTime([march, september, june], byDate, 'desc'))).toEqual(['september', 'june', 'march']);
	});

	it('puts the oldest first when ascending', () => {
		expect(ids(sortByDateTime([march, september, june], byDate, 'asc'))).toEqual(['march', 'june', 'september']);
	});

	it('puts an undated row last in either direction', () => {
		expect(ids(sortByDateTime([undated, march, september], byDate, 'desc')).at(-1)).toBe('undated');
		expect(ids(sortByDateTime([undated, march, september], byDate, 'asc')).at(-1)).toBe('undated');
	});

	it('leaves the list it was given untouched', () => {
		const list = [march, september];
		sortByDateTime(list, byDate, 'desc');
		expect(ids(list)).toEqual(['march', 'september']);
	});
});

describe('compareDateTimes', () => {
	it('can be combined with other comparisons in a sort', () => {
		expect(compareDateTimes(1, 2, 'asc')).toBeLessThan(0);
		expect(compareDateTimes(1, 2, 'desc')).toBeGreaterThan(0);
		expect(compareDateTimes(null, 2, 'asc')).toBeGreaterThan(0);
		expect(compareDateTimes(null, 2, 'desc')).toBeGreaterThan(0);
		expect(compareDateTimes(null, null, 'asc')).toBe(0);
	});
});

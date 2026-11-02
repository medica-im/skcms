import { describe, expect, test } from 'vitest';
import { emptyDays, toDraft } from './scheduleApi.ts';
import {
	applyToDays,
	draftError,
	nextPeriod,
	periodsError,
	shortcutDays,
	sharedPeriods
} from './scheduleEditor.ts';

const p = (opens: string, closes: string) => ({ opens, closes });

describe('nextPeriod', () => {
	test('a closed day starts with a morning', () => {
		expect(nextPeriod([])).toEqual(p('09:00', '12:00'));
	});

	test('a further period starts where the last one ended, two hours long', () => {
		expect(nextPeriod([p('08:00', '12:00')])).toEqual(p('12:00', '14:00'));
	});

	test('a further period stops at midnight at the latest', () => {
		expect(nextPeriod([p('08:00', '23:00')])).toEqual(p('23:00', '24:00'));
	});

	test('nothing can be added after midnight', () => {
		expect(nextPeriod([p('08:00', '24:00')])).toBeNull();
	});
});

describe('periodsError', () => {
	test('valid periods have no error', () => {
		expect(periodsError([p('08:00', '12:00'), p('14:00', '18:00')])).toBeNull();
	});

	test('touching periods are valid', () => {
		expect(periodsError([p('08:00', '12:00'), p('12:00', '18:00')])).toBeNull();
	});

	test('a period must end after it starts', () => {
		expect(periodsError([p('12:00', '12:00')])).toMatch(/terminer/);
		expect(periodsError([p('12:00', '08:00')])).toMatch(/terminer/);
	});

	test('periods may not overlap, whatever the order they were typed in', () => {
		expect(periodsError([p('14:00', '18:00'), p('08:00', '15:00')])).toMatch(/chevauch/);
	});

	test('an empty field is an error', () => {
		expect(periodsError([p('', '12:00')])).toMatch(/horaire/);
	});
});

describe('applyToDays', () => {
	test('writes the same hours on every selected day and leaves the others alone', () => {
		const days = { ...emptyDays(), 6: [p('09:00', '12:00')] };
		const next = applyToDays(days, [1, 2, 3], [p('08:00', '20:00')]);
		expect(next[1]).toEqual([p('08:00', '20:00')]);
		expect(next[3]).toEqual([p('08:00', '20:00')]);
		expect(next[4]).toEqual([]);
		expect(next[6]).toEqual([p('09:00', '12:00')]);
	});

	test('does not share one list between days', () => {
		const next = applyToDays(emptyDays(), [1, 2], [p('08:00', '20:00')]);
		next[1][0].opens = '09:00';
		expect(next[2][0].opens).toBe('08:00');
	});

	test('no periods closes the selected days', () => {
		const days = { ...emptyDays(), 1: [p('08:00', '20:00')] };
		expect(applyToDays(days, [1], [])[1]).toEqual([]);
	});

	test('does not change the draft it was given', () => {
		const days = emptyDays();
		applyToDays(days, [1], [p('08:00', '20:00')]);
		expect(days[1]).toEqual([]);
	});
});

describe('sharedPeriods', () => {
	test('is the hours of the selected days when they all agree', () => {
		const days = { ...emptyDays(), 1: [p('08:00', '12:00')], 2: [p('08:00', '12:00')] };
		expect(sharedPeriods(days, [1, 2])).toEqual([p('08:00', '12:00')]);
	});

	test('is null when the selected days differ', () => {
		const days = { ...emptyDays(), 1: [p('08:00', '12:00')], 2: [p('09:00', '12:00')] };
		expect(sharedPeriods(days, [1, 2])).toBeNull();
	});

	test('is empty for a selection of closed days', () => {
		expect(sharedPeriods(emptyDays(), [3, 4])).toEqual([]);
	});

	test('is empty when nothing is selected', () => {
		expect(sharedPeriods(emptyDays(), [])).toEqual([]);
	});
});

describe('on Svelte state', () => {
	// $state wraps objects in a proxy, which structuredClone refuses to copy;
	// the editor hands its draft to these helpers as such a proxy.
	const proxied = <T extends object>(value: T) => new Proxy(value, {});

	test('applyToDays copies a proxied draft', () => {
		const days = proxied({ ...emptyDays(), 1: [p('08:00', '12:00')] });
		expect(applyToDays(days, [2], [p('09:00', '10:00')])[1]).toEqual([p('08:00', '12:00')]);
	});

	test('sharedPeriods copies from a proxied draft', () => {
		const days = proxied({ ...emptyDays(), 1: [p('08:00', '12:00')] });
		expect(sharedPeriods(days, [1])).toEqual([p('08:00', '12:00')]);
	});

	test('toDraft copies a proxied schedule', () => {
		const schedule = proxied({
			uid: 'u', entry: 'e', channel: 'phone' as const, label: null, holidays: 'closed' as const,
			days: { '1': [p('08:00', '12:00')] }
		});
		expect(toDraft(schedule).days[1]).toEqual([p('08:00', '12:00')]);
	});
});

describe('shortcutDays', () => {
	test('names the days each shortcut selects', () => {
		expect(shortcutDays('weekdays')).toEqual([1, 2, 3, 4, 5]);
		expect(shortcutDays('everyday')).toEqual([1, 2, 3, 4, 5, 6, 7]);
	});
});

describe('draftError', () => {
	test('names the first day with a problem', () => {
		const days = { ...emptyDays(), 1: [p('08:00', '12:00')], 3: [p('12:00', '08:00')] };
		expect(draftError(days)).toMatch(/mercredi/i);
	});

	test('a draft with valid days has no error', () => {
		expect(draftError({ ...emptyDays(), 1: [p('08:00', '12:00')] })).toBeNull();
	});
});

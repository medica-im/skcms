import { describe, expect, test, vi } from 'vitest';
import {
	fetchSchedules,
	toOpeningSchedule,
	toPayload,
	emptyDays,
	type ApiSchedule
} from './scheduleApi.ts';

const live: ApiSchedule = {
	uid: 'a'.repeat(32),
	entry: 'b'.repeat(32),
	channel: 'phone',
	label: 'Accueil téléphonique',
	holidays: 'open',
	days: {
		'1': [{ opens: '08:00', closes: '20:00' }],
		'2': [
			{ opens: '08:00', closes: '12:00' },
			{ opens: '14:00', closes: '18:00' }
		],
		'3': [],
		'4': [],
		'5': [],
		'6': [],
		'7': []
	}
};

describe('toOpeningSchedule', () => {
	test('turns the JSON day keys into day numbers', () => {
		const s = toOpeningSchedule(live);
		expect(s.days[1]).toEqual([{ opens: '08:00', closes: '20:00' }]);
		expect(s.days[2]).toHaveLength(2);
		expect(s.holidays).toBe('open');
	});

	test('a day the API left out is closed', () => {
		const s = toOpeningSchedule({ ...live, days: { '1': live.days['1'] } });
		expect(s.days[5]).toEqual([]);
	});
});

describe('toPayload', () => {
	test('sends only the days that have hours, with the entry it belongs to', () => {
		const payload = toPayload('entry-1', {
			channel: 'on_site',
			label: '',
			holidays: 'closed',
			days: { ...emptyDays(), 1: [{ opens: '09:00', closes: '12:00' }] }
		});
		expect(payload).toEqual({
			entry: 'entry-1',
			channel: 'on_site',
			label: null,
			holidays: 'closed',
			days: { 1: [{ opens: '09:00', closes: '12:00' }] }
		});
	});
});

describe('emptyDays', () => {
	test('is a week of closed days, each its own list', () => {
		const days = emptyDays();
		expect(Object.keys(days)).toHaveLength(7);
		days[1].push({ opens: '08:00', closes: '09:00' });
		expect(days[2]).toEqual([]);
	});
});

describe('fetchSchedules', () => {
	const answer = (ok: boolean, body: unknown) =>
		vi.fn(
			async (_url: RequestInfo | URL) =>
				({ ok, status: ok ? 200 : 502, json: async () => body }) as Response
		);

	test('asks for the schedules of the entry and returns them', async () => {
		const fetch = answer(true, [live]);
		expect(await fetchSchedules(fetch, 'e1')).toEqual([live]);
		expect(fetch.mock.calls[0][0]).toMatch(/\/api\/v2\/entries\/e1\/schedules$/);
	});

	test('a page still renders when the schedules cannot be read', async () => {
		expect(await fetchSchedules(answer(false, 'bad gateway'), 'e1')).toEqual([]);
		expect(
			await fetchSchedules(
				vi.fn(async () => {
					throw new Error('offline');
				}),
				'e1'
			)
		).toEqual([]);
	});
});

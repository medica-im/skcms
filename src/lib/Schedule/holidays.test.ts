import { beforeEach, describe, expect, test, vi } from 'vitest';
import { holidaysFor, timeZoneOf, resetHolidaysCache } from './holidays.ts';

const ok = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
const failing = () => Promise.resolve(new Response('', { status: 503 }));

beforeEach(() => resetHolidaysCache());

describe('holidaysFor', () => {
	test('asks the national calendar for the whole zone, every year at once', async () => {
		const fetchFn = vi.fn(() => ok({ '2026-12-25': 'Noël' }));
		expect(await holidaysFor('metropole', fetchFn)).toEqual({ '2026-12-25': 'Noël' });
		expect(fetchFn).toHaveBeenCalledWith('https://calendrier.api.gouv.fr/jours-feries/metropole.json');
	});

	test('asks once per zone however many schedules are on the page', async () => {
		const fetchFn = vi.fn(() => ok({ '2026-12-25': 'Noël' }));
		await Promise.all([holidaysFor('metropole', fetchFn), holidaysFor('metropole', fetchFn)]);
		expect(fetchFn).toHaveBeenCalledTimes(1);
	});

	test('keeps zones apart', async () => {
		const fetchFn = vi.fn((url: string) =>
			ok(url.includes('alsace-moselle') ? { '2026-12-26': 'Saint Étienne' } : {})
		);
		expect(await holidaysFor('alsace-moselle', fetchFn)).toHaveProperty('2026-12-26');
		expect(await holidaysFor('metropole', fetchFn)).not.toHaveProperty('2026-12-26');
	});

	test('falls back to the bundled calendar of metropolitan France when the service is down', async () => {
		const holidays = await holidaysFor('metropole', failing);
		expect(holidays).toHaveProperty('2026-12-25');
	});

	test('falls back the same way when the request itself fails', async () => {
		const holidays = await holidaysFor('metropole', () => Promise.reject(new Error('offline')));
		expect(holidays).toHaveProperty('2026-12-25');
	});

	test('a failure is not remembered: the next call asks again', async () => {
		const fetchFn = vi.fn().mockImplementationOnce(failing).mockImplementation(() => ok({ '2026-01-01': 'Jour de l’an' }));
		await holidaysFor('metropole', fetchFn);
		expect(await holidaysFor('metropole', fetchFn)).toEqual({ '2026-01-01': 'Jour de l’an' });
		expect(fetchFn).toHaveBeenCalledTimes(2);
	});

	test('a zone with no bundled calendar has no holidays when the service is down', async () => {
		expect(await holidaysFor('mayotte', failing)).toEqual({});
	});
});

describe('timeZoneOf', () => {
	test.each([
		['metropole', 'Europe/Paris'],
		['alsace-moselle', 'Europe/Paris'],
		['la-reunion', 'Indian/Reunion'],
		['guadeloupe', 'America/Guadeloupe'],
		['martinique', 'America/Martinique'],
		['guyane', 'America/Cayenne'],
		['mayotte', 'Indian/Mayotte']
	])('%s is on %s', (zone, timeZone) => {
		expect(timeZoneOf(zone)).toBe(timeZone);
	});

	test('an unknown zone is read as metropolitan France', () => {
		expect(timeZoneOf('nowhere')).toBe('Europe/Paris');
	});
});

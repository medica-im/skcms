import { describe, it, expect, vi } from 'vitest';
import { communeCentre } from './communeCentre';

const municipality = (city: string, context: string, lngLat: [number, number]) => ({
	type: 'Feature',
	geometry: { type: 'Point', coordinates: lngLat },
	properties: { type: 'municipality', city, context }
});

const answering = (features: unknown[]) =>
	vi.fn(async (_url: string) => new Response(JSON.stringify({ features }), { status: 200 }));

describe('communeCentre', () => {
	it('asks the BAN for municipalities only', async () => {
		const fetch = answering([municipality('Vedène', '84, Vaucluse, Provence', [4.9, 43.97])]);

		await communeCentre('Vedène', '84', fetch);

		const url = new URL(fetch.mock.calls[0][0]);
		expect(url.origin).toBe('https://api-adresse.data.gouv.fr');
		expect(url.searchParams.get('q')).toBe('Vedène');
		expect(url.searchParams.get('type')).toBe('municipality');
	});

	it('returns the centre as [lat, lng]', async () => {
		const fetch = answering([municipality('Vedène', '84, Vaucluse, Provence', [4.9, 43.97])]);

		expect(await communeCentre('Vedène', '84', fetch)).toEqual([43.97, 4.9]);
	});

	it('picks the namesake in the right department', async () => {
		const fetch = answering([
			municipality('Saint-Jean', '31, Haute-Garonne, Occitanie', [1.5, 43.66]),
			municipality('Saint-Jean', '06, Alpes-Maritimes, Provence', [7.1, 43.8])
		]);

		expect(await communeCentre('Saint-Jean', '06', fetch)).toEqual([43.8, 7.1]);
	});

	it('takes the first answer when the department is unknown', async () => {
		const fetch = answering([
			municipality('Saint-Jean', '31, Haute-Garonne, Occitanie', [1.5, 43.66]),
			municipality('Saint-Jean', '06, Alpes-Maritimes, Provence', [7.1, 43.8])
		]);

		expect(await communeCentre('Saint-Jean', null, fetch)).toEqual([43.66, 1.5]);
	});

	it('returns null when no municipality matches the department', async () => {
		const fetch = answering([municipality('Saint-Jean', '31, Haute-Garonne', [1.5, 43.66])]);

		expect(await communeCentre('Saint-Jean', '06', fetch)).toBeNull();
	});

	it('returns null when the BAN cannot be reached', async () => {
		const fetch = vi.fn(async () => {
			throw new TypeError('network');
		});

		expect(await communeCentre('Vedène', '84', fetch)).toBeNull();
	});

	it('returns null on an error status', async () => {
		const fetch = vi.fn(async () => new Response('', { status: 503 }));

		expect(await communeCentre('Vedène', '84', fetch)).toBeNull();
	});
});

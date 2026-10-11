import { describe, it, expect } from 'vitest';
import { hasCoordinates, distanceKm } from './coordinates';

describe('hasCoordinates', () => {
	it.each([
		['null', null, null],
		['undefined', undefined, undefined],
		['empty strings', '', ''],
		['only a latitude', 45.75, null],
		['only a longitude', null, 4.88],
		['NaN', Number.NaN, 4.88],
		['not a number', 'abc', '4.88'],
		['0/0 as numbers', 0, 0],
		['0/0 as the API sends it', '0.0', '0.0'],
		['a latitude out of range', 91, 4.88],
		['a longitude out of range', 45.75, 181]
	])('is false for %s', (_, lat, lng) => {
		expect(hasCoordinates(lat, lng)).toBe(false);
	});

	it.each([
		['numbers', 45.749014, 4.882709],
		['the strings the API sends', '45.749014', '4.882709'],
		['a point on the equator', 0, 4.88],
		['a point on the Greenwich meridian', 45.75, 0]
	])('is true for %s', (_, lat, lng) => {
		expect(hasCoordinates(lat, lng)).toBe(true);
	});
});

describe('distanceKm', () => {
	it('is zero between a point and itself', () => {
		expect(distanceKm([45.75, 4.88], [45.75, 4.88])).toBe(0);
	});

	it('measures Lyon to Avignon as about 200 km', () => {
		const lyon: [number, number] = [45.764, 4.8357];
		const avignon: [number, number] = [43.9493, 4.8055];
		expect(distanceKm(lyon, avignon)).toBeGreaterThan(195);
		expect(distanceKm(lyon, avignon)).toBeLessThan(207);
	});
});

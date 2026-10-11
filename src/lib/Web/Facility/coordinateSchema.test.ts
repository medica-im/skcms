import { describe, it, expect } from 'vitest';
import { latitude, longitude } from './coordinateSchema';

describe('the facility form coordinates', () => {
	it.each([
		['an empty field', ''],
		['a blank field', '  '],
		['null', null],
		['a missing field', undefined]
	])('send %s as null', (_, value) => {
		expect(latitude.parse(value)).toBeNull();
		expect(longitude.parse(value)).toBeNull();
	});

	it('parse a coordinate typed or picked on the map', () => {
		expect(latitude.parse('45.749014')).toBe(45.749014);
		expect(longitude.parse('4.882709')).toBe(4.882709);
		expect(longitude.parse(-1.463151)).toBe(-1.463151);
	});

	it.each([
		['a latitude beyond the pole', latitude, '91'],
		['a longitude beyond the antimeridian', longitude, '-181'],
		['text', latitude, 'abc']
	])('refuse %s', (_, schema, value) => {
		expect(schema.safeParse(value).success).toBe(false);
	});
});

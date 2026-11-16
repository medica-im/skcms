/**
 * How an entry's age bounds read on its page: nothing when neither is known,
 * "à partir de 16 ans" for a lower bound alone, "jusqu'à 17 ans" for an upper one
 * alone, "de 12 à 17 ans" for both. A lower bound of 0 says nothing (everyone is 0 or
 * older): "à partir de 0 ans" read as a joke on the page, so it is no bound at all.
 */
import { describe, it, expect } from 'vitest';
import { ageRange } from './ageRange.ts';

describe('ageRange', () => {
	it('is nothing when no bound is known', () => {
		expect(ageRange(null, null)).toBeNull();
		expect(ageRange(undefined, undefined)).toBeNull();
	});

	it('names a lower bound alone', () => {
		expect(ageRange(16, null)).toEqual({ kind: 'from', min: 16 });
	});

	it('names an upper bound alone', () => {
		expect(ageRange(null, 17)).toEqual({ kind: 'upTo', max: 17 });
	});

	it('names both', () => {
		expect(ageRange(12, 17)).toEqual({ kind: 'range', min: 12, max: 17 });
	});

	it('reads a lower bound of 0 as no bound', () => {
		expect(ageRange(0, 11)).toEqual({ kind: 'upTo', max: 11 });
		expect(ageRange(0, null)).toBeNull();
	});
});

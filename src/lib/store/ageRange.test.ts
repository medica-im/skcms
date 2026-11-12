/**
 * How an entry's age bounds read on its page: nothing when neither is known,
 * "à partir de 16 ans" for a lower bound alone, "jusqu'à 17 ans" for an upper one
 * alone, "de 12 à 17 ans" for both. A bound of 0 is a number, not a missing one.
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

	it('keeps 0 as a bound', () => {
		expect(ageRange(0, 11)).toEqual({ kind: 'range', min: 0, max: 11 });
		expect(ageRange(0, null)).toEqual({ kind: 'from', min: 0 });
	});
});

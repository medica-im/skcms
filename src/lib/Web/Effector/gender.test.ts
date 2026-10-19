/**
 * Which grammatical genders a person may be given, by what their entry does.
 *
 * Only a profession's label agrees with the person practising it: an
 * infirmière, an infirmier. A service or an activity has one form whoever
 * provides it, so there is no gender to ask for; a type whose nature is not
 * known yet reads as a profession, as the directory's headings read it.
 */
import { describe, expect, it } from 'vitest';
import { FIXED_GENDER, gendersFor, professionWords } from './gender.ts';

describe('gendersFor', () => {
	it('offers the feminine and the masculine for a profession, never the neutral', () => {
		expect(gendersFor('profession')).toEqual(['F', 'M']);
	});

	it('offers nothing for a service or an activity', () => {
		expect(gendersFor('service')).toEqual([]);
		expect(gendersFor('activity')).toEqual([]);
	});

	it('reads a type whose nature is not known yet as a profession', () => {
		expect(gendersFor(null)).toEqual(['F', 'M']);
		expect(gendersFor(undefined)).toEqual(['F', 'M']);
	});

	it('gives the effector of a service or an activity the neutral', () => {
		expect(FIXED_GENDER).toBe('N');
	});
});

describe('professionWords', () => {
	const forms = (F: string | null, M: string | null) => ({ S: { F, M, N: M }, P: { F: null, M: null, N: null } });

	it('gives the singular feminine and masculine a person’s entry will show', () => {
		expect(professionWords({ t: forms('infirmière', 'infirmier') }, 't')).toEqual({ F: 'infirmière', M: 'infirmier' });
	});

	it('gives nothing when the type has no label, or lacks either form', () => {
		expect(professionWords({}, 't')).toBeNull();
		expect(professionWords({ t: forms('infirmière', null) }, 't')).toBeNull();
		expect(professionWords({ t: forms('infirmière', 'infirmier') }, undefined)).toBeNull();
	});
});

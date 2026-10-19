/**
 * The form a type's label takes above a group of entries, by the type's nature.
 *
 * A profession is practised by a person, so its label agrees with the
 * practitioners' gender and with their number: "infirmière", "infirmiers". A
 * service is provided by a structure: its label agrees in number only,
 * "pharmacie", "pharmacies", whatever gender its effectors carry. An activity
 * is carried out: "portage de repas à domicile" has one form, however many
 * entries offer it.
 */
import { describe, it, expect } from 'vitest';
import { genderedLabel } from './directoryStore.ts';
import { makeEntry, NURSE } from './directoryStore.fixtures.ts';
import type { Entry, Type } from './directoryStoreInterface';
import type { Labels } from '$lib/interfaces/label.interace.ts';

const NURSE_PROFESSION = { ...NURSE, nature: 'profession' } as Type;
const PHARMACY = { ...NURSE, uid: 'type-pharmacy', name: 'pharmacie', nature: 'service' } as Type;
const MEALS = { ...NURSE, uid: 'type-meals', name: 'portage de repas à domicile', nature: 'activity' } as Type;

const forms = (F: string | null, M: string | null, N: string | null) => ({ F, M, N });
const none = forms(null, null, null);
const labels: Labels = {
	[NURSE.uid]: {
		S: forms('infirmière', 'infirmier', 'infirmier'),
		P: forms('infirmières', 'infirmiers', 'infirmiers')
	},
	[PHARMACY.uid]: { S: forms(null, null, 'pharmacie'), P: forms(null, null, 'pharmacies') },
	[MEALS.uid]: { S: forms(null, null, 'portage de repas à domicile'), P: none }
};

const entries = (type: Type, ...genders: (string | null)[]): Entry[] =>
	genders.map((gender, i) => ({ ...makeEntry({ uid: `entry-${i}`, type }), gender }) as Entry);

describe('a profession agrees with its practitioners', () => {
	it('in gender, for one', () => {
		expect(genderedLabel(entries(NURSE_PROFESSION, 'F'), labels, 'fallback')).toBe('infirmière');
		expect(genderedLabel(entries(NURSE_PROFESSION, 'M'), labels, 'fallback')).toBe('infirmier');
	});

	it('in the gender most of them have, and in the plural, for several', () => {
		expect(genderedLabel(entries(NURSE_PROFESSION, 'F', 'F', 'M'), labels, 'fallback')).toBe('infirmières');
		expect(genderedLabel(entries(NURSE_PROFESSION, 'F', 'M'), labels, 'fallback')).toBe('infirmiers');
	});

	it('in the neutral when none of them has a gender', () => {
		expect(genderedLabel(entries(NURSE_PROFESSION, null, null), labels, 'fallback')).toBe('infirmiers');
	});

	it('and so does a type whose nature is not known yet', () => {
		expect(genderedLabel(entries(NURSE, 'F', 'F'), labels, 'fallback')).toBe('infirmières');
	});
});

describe('a service agrees in number only', () => {
	it('whatever gender its effectors carry', () => {
		expect(genderedLabel(entries(PHARMACY, 'F'), labels, 'fallback')).toBe('pharmacie');
		expect(genderedLabel(entries(PHARMACY, 'F', 'M', null), labels, 'fallback')).toBe('pharmacies');
	});

	it('reading its word from whichever gender holds it', () => {
		const masculineOnly: Labels = { [PHARMACY.uid]: { S: forms(null, 'laboratoire', null), P: forms(null, 'laboratoires', null) } };
		expect(genderedLabel(entries(PHARMACY, 'F', 'F'), masculineOnly, 'fallback')).toBe('laboratoires');
	});
});

describe('an activity has one form', () => {
	it('however many entries offer it', () => {
		expect(genderedLabel(entries(MEALS, 'F'), labels, 'fallback')).toBe('portage de repas à domicile');
		expect(genderedLabel(entries(MEALS, 'F', 'M', null, null), labels, 'fallback')).toBe('portage de repas à domicile');
	});
});

it('falls back when the type has no label at all', () => {
	expect(genderedLabel(entries(PHARMACY, 'F', 'M'), {}, 'pharmacie')).toBe('pharmacie');
});

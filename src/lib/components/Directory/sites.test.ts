import { describe, expect, test } from 'vitest';
import { findSecretariat, establishments, spansCommunes } from './sites.ts';
import type { Facility } from '#lib/interfaces/facility.interface.ts';
import type { Entry } from '#lib/store/directoryStoreInterface.ts';

const entry = (uid: string, type: string, facility: string, active: boolean | null = true) =>
	({ uid, active, effector_type: { name: type }, facility: { uid: facility } }) as unknown as Entry;

describe('findSecretariat', () => {
	const entries = [
		entry('doctor', 'médecin généraliste', 'felibrige'),
		entry('desk', 'secrétariat', 'felibrige'),
		entry('other-desk', 'secrétariat', 'elsewhere')
	];

	test('is the secretariat located at the facility', () => {
		expect(findSecretariat(entries, 'felibrige')?.uid).toBe('desk');
	});

	test('is found by the French name of its type, never by a uid', () => {
		expect(findSecretariat([entry('x', 'secrétaire médical', 'felibrige')], 'felibrige')).toBeUndefined();
	});

	test('a facility without one has none', () => {
		expect(findSecretariat(entries, 'unknown')).toBeUndefined();
		expect(findSecretariat(entries, undefined)).toBeUndefined();
	});

	test('an inactive secretariat is not shown', () => {
		expect(findSecretariat([entry('desk', 'secrétariat', 'felibrige', false)], 'felibrige')).toBeUndefined();
	});
});

describe('establishments', () => {
	const facility = (uid: string, name: string, orgs: string[] = ['msp']) =>
		({ uid, name, slug: uid, organizations: orgs, entries: [] }) as unknown as Facility;
	const member = (uid: string, type: string, fac: string) =>
		({ ...entry(uid, type, fac), memberships: ['msp'] }) as unknown as Entry;

	const facilities = [facility('pharmacy', 'Pharmacie'), facility('felibrige', 'Maison de santé')];
	const entries = [
		member('a', 'pharmacien', 'pharmacy'),
		member('b', 'médecin généraliste', 'felibrige'),
		entry('desk', 'secrétariat', 'felibrige')
	];

	test('lists a facility with the secretariat located there', () => {
		const list = establishments(facilities, entries, 'msp');
		expect(list.map((x) => [x.facility.uid, x.secretariat?.uid])).toEqual([
			['felibrige', 'desk'],
			['pharmacy', undefined]
		]);
	});

	test('puts the facilities with a secretariat first, the others keep their order', () => {
		const list = establishments([...facilities, facility('lab', 'Laboratoire')], [...entries, member('c', 'biologiste', 'lab')], 'msp');
		expect(list.map((x) => x.facility.uid)).toEqual(['felibrige', 'pharmacy', 'lab']);
	});

	test('a facility where no member practises is left out', () => {
		expect(establishments([facility('empty', 'Vide')], entries, 'msp')).toEqual([]);
	});
});

describe('spansCommunes', () => {
	const inCity = (city: string | undefined) => ({ address: { city } }) as unknown as Facility;

	test('is false when every facility is in the same commune', () => {
		expect(spansCommunes([inCity('Gadagne'), inCity('Gadagne')])).toBe(false);
	});

	test('is true as soon as two communes appear', () => {
		expect(spansCommunes([inCity('Gadagne'), inCity('Apt')])).toBe(true);
	});

	test('a facility with no known commune does not count as another one', () => {
		expect(spansCommunes([inCity('Gadagne'), inCity(undefined)])).toBe(false);
	});

	test('nothing to compare is false', () => {
		expect(spansCommunes([])).toBe(false);
	});
});

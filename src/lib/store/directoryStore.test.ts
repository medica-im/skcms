/**
 * Characterization tests for the directory filter chain.
 *
 * These pin the behaviour the addressbook has *today*, ahead of the Svelte 5
 * rewrite of CtxDirectory: the rewrite is meant to change how the values are
 * derived, never what they are. A failure here means a filter's meaning moved,
 * which is exactly what must not happen.
 *
 * They deliberately assert on identity (which entries) rather than only on
 * counts, since a filter that returns the right number of wrong rows is still
 * broken.
 *
 * The reactive half of the contract — that changing a selector actually
 * re-runs this chain and re-renders the list — cannot be seen from here and is
 * covered by CtxDirectory.svelte.test.ts.
 */
import { describe, it, expect } from 'vitest';
import {
	fullFilteredEntriesF,
	filteredEntriesF,
	categorizedFilteredEffectorsF,
	categorizedFullFilteredEffectorsF,
	categoryOfF,
	communeOfF,
	departmentOfF,
	facilityOfF,
	tagOfF
} from './directoryStore.ts';
import {
	makeEntry,
	makeSituation,
	organization,
	ORG_UID,
	NURSE,
	DOCTOR,
	TAG_ONCO,
	TAG_GERIA
} from './directoryStore.fixtures.ts';

const uids = (entries: { uid: string }[]) => entries.map((e) => e.uid).sort();

describe('fullFilteredEntriesF', () => {
	const alice = makeEntry({ uid: 'alice', name: 'Alice Martin', type: NURSE });
	const bob = makeEntry({ uid: 'bob', name: 'Bob Durand', type: DOCTOR });
	const inactive = makeEntry({ uid: 'inactive', name: 'Carol Absent', active: false });
	const outsider = makeEntry({ uid: 'outsider', name: 'Dan Extern', memberships: [] });
	const all = [alice, bob, inactive, outsider];

	it('returns every entry untouched when no filter applies at all', () => {
		// The early return exists so the common case does no work; it must not
		// quietly also skip the active filter, hence `active: null` here.
		const result = fullFilteredEntriesF([], all, undefined, null, organization, [], null);
		expect(result).toBe(all);
	});

	it('keeps only active entries by default', () => {
		const result = fullFilteredEntriesF([], all, undefined, null, organization, [], true);
		expect(uids(result)).toEqual(['alice', 'bob', 'outsider']);
	});

	it('keeps only inactive entries when asked for them', () => {
		const result = fullFilteredEntriesF([], all, undefined, null, organization, [], false);
		expect(uids(result)).toEqual(['inactive']);
	});

	it('limits to the given effector-type slugs', () => {
		const result = fullFilteredEntriesF([], all, undefined, null, organization, [DOCTOR.slug], true);
		expect(uids(result)).toEqual(['bob']);
	});

	it('keeps members of the current organization when currentOrg is true', () => {
		const result = fullFilteredEntriesF([], all, undefined, true, organization, [], true);
		expect(uids(result)).toEqual(['alice', 'bob']);
	});

	it('keeps non-members when currentOrg is false', () => {
		const result = fullFilteredEntriesF([], all, undefined, false, organization, [], true);
		expect(uids(result)).toEqual(['outsider']);
	});

	it('treats the organization entry itself as a member', () => {
		const orgEntry = makeEntry({ uid: ORG_UID, name: 'La MSP', memberships: [] });
		const result = fullFilteredEntriesF([], [orgEntry], undefined, true, organization, [], true);
		expect(uids(result)).toEqual([ORG_UID]);
	});

	it('keeps only the entries listed by the selected situation', () => {
		const situations = [makeSituation('sit-1', ['alice'])];
		const selected = { label: 'Situation 1', value: 'sit-1' };
		const result = fullFilteredEntriesF(situations, all, selected, null, organization, [], true);
		expect(uids(result)).toEqual(['alice']);
	});

	it('yields nothing when the selected situation is unknown', () => {
		const selected = { label: 'Ghost', value: 'sit-missing' };
		const result = fullFilteredEntriesF([], all, selected, null, organization, [], true);
		expect(result).toEqual([]);
	});
});

describe('filteredEntriesF', () => {
	const alice = makeEntry({
		uid: 'alice',
		name: 'Alice Martin',
		type: NURSE,
		communeUid: 'commune-a',
		departmentCode: '84',
		facilityUid: 'facility-a',
		tags: [TAG_ONCO]
	});
	const bob = makeEntry({
		uid: 'bob',
		name: 'Bob Durand',
		type: DOCTOR,
		communeUid: 'commune-b',
		departmentCode: '69',
		facilityUid: 'facility-b',
		tags: [TAG_ONCO, TAG_GERIA]
	});
	const all = [alice, bob];

	/** The arguments that mean "nothing is selected". */
	const NONE = {
		categories: [] as string[],
		department: null,
		communes: [] as string[],
		facility: null,
		term: '',
		tags: null
	};

	const run = (o: Partial<typeof NONE> = {}) => {
		const { categories, department, communes, facility, term, tags } = { ...NONE, ...o };
		return filteredEntriesF(all, categories, department, communes, facility, term, tags);
	};

	it('returns the input untouched when nothing is selected', () => {
		expect(run()).toBe(all);
	});

	it('filters by effector-type uid', () => {
		expect(uids(run({ categories: [NURSE.uid] }))).toEqual(['alice']);
	});

	it('filters by department code', () => {
		expect(uids(run({ department: { label: 'Rhône', value: '69' } }))).toEqual(['bob']);
	});

	it('filters by commune uid', () => {
		expect(uids(run({ communes: ['commune-a'] }))).toEqual(['alice']);
	});

	it('filters by facility uid', () => {
		expect(uids(run({ facility: 'facility-b' }))).toEqual(['bob']);
	});

	it('matches the search term case-insensitively', () => {
		expect(uids(run({ term: 'alice' }))).toEqual(['alice']);
	});

	it('matches the search term ignoring accents', () => {
		// normalize() strips diacritics on both sides, so a user typing "durand"
		// still finds "Durand" — and would still find "Durànd".
		expect(uids(run({ term: 'dürand' }))).toEqual(['bob']);
	});

	it('requires every selected tag to be present, not just one', () => {
		expect(uids(run({ tags: [TAG_ONCO] }))).toEqual(['alice', 'bob']);
		expect(uids(run({ tags: [TAG_ONCO, TAG_GERIA] }))).toEqual(['bob']);
	});

	it('composes several selectors as a conjunction', () => {
		expect(uids(run({ categories: [NURSE.uid], communes: ['commune-a'] }))).toEqual(['alice']);
		// The same category in a commune it is not in yields nothing.
		expect(run({ categories: [NURSE.uid], communes: ['commune-b'] })).toEqual([]);
	});
});

describe('categorizedFilteredEffectorsF', () => {
	const alice = makeEntry({ uid: 'alice', name: 'Alice', type: NURSE });
	const bob = makeEntry({ uid: 'bob', name: 'Bob', type: DOCTOR });
	const claire = makeEntry({ uid: 'claire', name: 'Claire', type: NURSE });

	it('groups entries by effector type name, alphabetically', () => {
		const result = categorizedFilteredEffectorsF([bob, alice, claire]);
		expect([...result.keys()]).toEqual(['infirmier', 'medecin']);
		expect(uids(result.get('infirmier')!)).toEqual(['alice', 'claire']);
		expect(uids(result.get('medecin')!)).toEqual(['bob']);
	});

	it('orders groups by size, smallest first, when a situation is selected', () => {
		// With a situation chosen the page leads with the rarest speciality
		// rather than with the alphabet.
		const selected = { label: 'S', value: 's' };
		const result = categorizedFilteredEffectorsF([alice, claire, bob], null, selected);
		expect([...result.keys()]).toEqual(['medecin', 'infirmier']);
	});

	it('sorts each group by distance when distances are supplied', () => {
		const near = makeEntry({ uid: 'near', name: 'Near', type: NURSE, facilityUid: 'f-near' });
		const far = makeEntry({ uid: 'far', name: 'Far', type: NURSE, facilityUid: 'f-far' });
		const result = categorizedFilteredEffectorsF([far, near], { 'f-near': 10, 'f-far': 5000 });
		expect(result.get('infirmier')!.map((e) => e.uid)).toEqual(['near', 'far']);
	});

	it('returns an empty map for no entries', () => {
		expect([...categorizedFilteredEffectorsF([]).keys()]).toEqual([]);
	});
});

describe('categorizedFullFilteredEffectorsF', () => {
	it('groups the unfiltered set the same way', () => {
		const alice = makeEntry({ uid: 'alice', name: 'Alice', type: NURSE });
		const bob = makeEntry({ uid: 'bob', name: 'Bob', type: DOCTOR });
		const result = categorizedFullFilteredEffectorsF([alice, bob]);
		expect([...result.keys()].sort()).toEqual(['infirmier', 'medecin']);
	});
});

/**
 * The "…Of" functions feed the selector dropdowns. Their contract is that each
 * one narrows on the *other* selectors but not on itself — otherwise choosing a
 * commune would remove every other commune from the commune list, and the user
 * could never change their mind.
 */
describe('selector option lists', () => {
	const alice = makeEntry({
		uid: 'alice',
		name: 'Alice',
		type: NURSE,
		communeUid: 'commune-a',
		departmentCode: '84',
		facilityUid: 'facility-a',
		tags: [TAG_ONCO]
	});
	const bob = makeEntry({
		uid: 'bob',
		name: 'Bob',
		type: DOCTOR,
		communeUid: 'commune-b',
		departmentCode: '69',
		facilityUid: 'facility-b',
		tags: [TAG_GERIA]
	});
	const all = [alice, bob];

	it('categoryOfF lists every type when nothing else is selected', () => {
		const result = categoryOfF(all, [], null, null);
		expect(result.map((t) => t.uid).sort()).toEqual([DOCTOR.uid, NURSE.uid].sort());
	});

	it('categoryOfF narrows on the selected commune', () => {
		const result = categoryOfF(all, ['commune-a'], null, null);
		expect(result.map((t) => t.uid)).toEqual([NURSE.uid]);
	});

	it('categoryOfF tolerates a non-array input', () => {
		// The component can hand it undefined before data arrives.
		expect(categoryOfF(undefined as never, [], null, null)).toEqual([]);
	});

	it('communeOfF narrows on the selected category but keeps every commune otherwise', () => {
		expect(communeOfF(all, [], null, null).length).toBe(2);
		const narrowed = communeOfF(all, [NURSE.uid], null, null);
		expect(narrowed.map((c) => c.uid)).toEqual(['commune-a']);
	});

	it('departmentOfF lists the distinct department codes', () => {
		expect(departmentOfF(all, null, [], []).sort()).toEqual(['69', '84']);
	});

	it('departmentOfF narrows on the selected category', () => {
		expect(departmentOfF(all, null, [NURSE.uid], [])).toEqual(['84']);
	});

	it('facilityOfF narrows on the selected commune', () => {
		const result = facilityOfF(all, [], ['commune-b'], null);
		expect(result.map((f) => f.uid)).toEqual(['facility-b']);
	});

	it('tagOfF lists the tags of the entries still in play', () => {
		expect(tagOfF(all, null, [], [], null).map((t) => t.uid).sort()).toEqual(
			[TAG_ONCO.uid, TAG_GERIA.uid].sort()
		);
		expect(tagOfF(all, null, [NURSE.uid], [], null).map((t) => t.uid)).toEqual([TAG_ONCO.uid]);
	});
});

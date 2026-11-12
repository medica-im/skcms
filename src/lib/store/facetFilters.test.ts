/**
 * The facet selectors: who an entry is for and how to reach it.
 *
 * Every facet is optional and null means unknown, never "no": a selector must
 * over-include, so a gap in the data drops nobody. A selector only shows when
 * the listed entries could actually be narrowed by it, so a directory that stores
 * no facets (every directory but santé mentale today) shows none of them without
 * any configuration.
 */
import { describe, it, expect } from 'vitest';
import {
	NO_FACETS,
	filterByFacets,
	selectorsShown,
	optionsOf,
	type FacetSelection
} from './facetFilters.ts';
import { makeEntry } from './directoryStore.fixtures.ts';
import type { EntryFacets } from './directoryStoreInterface.ts';

const entry = (uid: string, facets: Partial<EntryFacets> = {}) => makeEntry({ uid, facets });
const uids = (entries: { uid: string }[]) => entries.map((e) => e.uid);
const select = (patch: Partial<FacetSelection>): FacetSelection => ({ ...NO_FACETS, ...patch });

describe('no selection', () => {
	it('keeps every entry, the same array', () => {
		const entries = [entry('a'), entry('b', { age_min: 18 })];
		expect(filterByFacets(entries, NO_FACETS)).toBe(entries);
	});
});

describe('age of the patient', () => {
	const entries = [
		entry('teens', { age_min: 12, age_max: 17 }),
		entry('adults', { age_min: 18 }),
		entry('children', { age_max: 11 }),
		entry('everyone', { age_min: 0 }),
		entry('unknown')
	];

	it('matches inclusive bounds, an open bound and an unknown age range', () => {
		expect(uids(filterByFacets(entries, select({ age: 16 })))).toEqual(['teens', 'everyone', 'unknown']);
		expect(uids(filterByFacets(entries, select({ age: 17 })))).toEqual(['teens', 'everyone', 'unknown']);
		expect(uids(filterByFacets(entries, select({ age: 18 })))).toEqual(['adults', 'everyone', 'unknown']);
	});

	it('does not drop a 90-year-old from an adults service', () => {
		expect(uids(filterByFacets(entries, select({ age: 90 })))).toContain('adults');
	});

	it('treats age 0 as a number, not as no selection', () => {
		expect(uids(filterByFacets(entries, select({ age: 0 })))).toEqual(['children', 'everyone', 'unknown']);
	});
});

describe('access (who may contact)', () => {
	const entries = [
		entry('open', { who_can_contact: 'anyone' }),
		entry('letter', { who_can_contact: 'referral' }),
		entry('pros', { who_can_contact: 'professionals' }),
		entry('unknown')
	];

	it('a patient alone reaches what is open to anyone', () => {
		expect(uids(filterByFacets(entries, select({ access: 'anyone' })))).toEqual(['open', 'unknown']);
	});

	it('a patient with a letter reaches what is open to anyone or on referral', () => {
		expect(uids(filterByFacets(entries, select({ access: 'referral' })))).toEqual(['open', 'letter', 'unknown']);
	});

	it('professionals only: what is reserved to them', () => {
		expect(uids(filterByFacets(entries, select({ access: 'professionals' })))).toEqual(['pros', 'unknown']);
	});
});

describe('multi-valued facets', () => {
	const entries = [
		entry('phone', { access_modes: ['phone'] }),
		entry('walk', { access_modes: ['walk_in', 'appointment'] }),
		entry('none', { access_modes: [] }),
		entry('unknown')
	];

	it('keeps an entry that offers any chosen mode, and the unknown ones', () => {
		expect(uids(filterByFacets(entries, select({ accessModes: ['phone', 'appointment'] })))).toEqual([
			'phone',
			'walk',
			'unknown'
		]);
	});

	it('an entry known to offer nothing is not an unknown one', () => {
		expect(uids(filterByFacets(entries, select({ accessModes: ['phone'] })))).not.toContain('none');
	});

	it('works the same for care levels and audiences', () => {
		const more = [
			entry('urgent', { care_levels: ['emergency'], audiences: ['students'] }),
			entry('primary', { care_levels: ['primary'], audiences: ['parents'] }),
			entry('unknown')
		];
		expect(uids(filterByFacets(more, select({ careLevels: ['emergency'] })))).toEqual(['urgent', 'unknown']);
		expect(uids(filterByFacets(more, select({ audiences: ['parents'] })))).toEqual(['primary', 'unknown']);
	});
});

describe('free and anonymous', () => {
	const entries = [
		entry('free', { free: true, anonymous_care: true }),
		entry('paid', { free: false, anonymous_care: false }),
		entry('unknown')
	];

	it('keeps what is not known to be paid', () => {
		expect(uids(filterByFacets(entries, select({ free: true })))).toEqual(['free', 'unknown']);
		expect(uids(filterByFacets(entries, select({ anonymous: true })))).toEqual(['free', 'unknown']);
	});
});

describe('selectors combine', () => {
	it('an entry must pass every chosen selector', () => {
		const entries = [
			entry('both', { age_min: 16, access_modes: ['phone'] }),
			entry('wrong-mode', { age_min: 16, access_modes: ['walk_in'] }),
			entry('too-young-only', { age_min: 18, access_modes: ['phone'] })
		];
		expect(uids(filterByFacets(entries, select({ age: 16, accessModes: ['phone'] })))).toEqual(['both']);
	});
});

describe('which selectors show', () => {
	it('none when the entries store no facets', () => {
		expect(selectorsShown([entry('a'), entry('b')])).toEqual([]);
	});

	it('age shows when any entry has a bound', () => {
		expect(selectorsShown([entry('a'), entry('b', { age_min: 16 })])).toContain('age');
	});

	it('a single-valued facet needs two distinct values to narrow anything', () => {
		const same = [entry('a', { who_can_contact: 'anyone' }), entry('b', { who_can_contact: 'anyone' })];
		expect(selectorsShown(same)).not.toContain('access');
		const differ = [entry('a', { who_can_contact: 'anyone' }), entry('b', { who_can_contact: 'referral' })];
		expect(selectorsShown(differ)).toContain('access');
	});

	it('a multi-valued facet needs two distinct values across the entries', () => {
		const one = [entry('a', { access_modes: ['phone'] }), entry('b', { access_modes: ['phone'] })];
		expect(selectorsShown(one)).not.toContain('accessModes');
		const two = [entry('a', { access_modes: ['phone'] }), entry('b', { access_modes: ['walk_in'] })];
		expect(selectorsShown(two)).toContain('accessModes');
	});

	it('free needs both a free and a paid entry: an unknown one narrows nothing', () => {
		expect(selectorsShown([entry('a', { free: true }), entry('b')])).not.toContain('free');
		expect(selectorsShown([entry('a', { free: true }), entry('b', { free: false })])).toContain('free');
	});

	it('comes back in the order a professional uses them', () => {
		const entries = [
			entry('a', {
				age_min: 0,
				who_can_contact: 'anyone',
				access_modes: ['phone'],
				care_levels: ['primary'],
				audiences: ['students'],
				free: true,
				anonymous_care: true
			}),
			entry('b', {
				age_min: 18,
				who_can_contact: 'referral',
				access_modes: ['walk_in'],
				care_levels: ['emergency'],
				audiences: ['parents'],
				free: false,
				anonymous_care: false
			})
		];
		expect(selectorsShown(entries)).toEqual([
			'age',
			'access',
			'accessModes',
			'careLevels',
			'audiences',
			'free',
			'anonymous'
		]);
	});
});

describe('options of a selector', () => {
	it('lists the values present, in the order of the vocabulary, with how many entries carry each', () => {
		const entries = [
			entry('a', { access_modes: ['online', 'phone'] }),
			entry('b', { access_modes: ['phone'] }),
			entry('c')
		];
		expect(optionsOf(entries, 'accessModes')).toEqual([
			{ value: 'phone', count: 2 },
			{ value: 'online', count: 1 }
		]);
	});

	it('works for a single-valued facet', () => {
		const entries = [
			entry('a', { who_can_contact: 'referral' }),
			entry('b', { who_can_contact: 'anyone' }),
			entry('c', { who_can_contact: 'anyone' })
		];
		expect(optionsOf(entries, 'access')).toEqual([
			{ value: 'anyone', count: 2 },
			{ value: 'referral', count: 1 }
		]);
	});
});

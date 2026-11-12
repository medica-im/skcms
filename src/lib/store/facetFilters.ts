import {
	ACCESS_MODES,
	AUDIENCES,
	CARE_LEVELS,
	WHO_CAN_CONTACT,
	type Entry,
	type EntryFacets
} from './directoryStoreInterface.ts';

/**
 * Selectors over what an entry stores about who it is for and how to reach it.
 *
 * Every facet is optional and null means unknown, never "no": a selector
 * over-includes, so a gap in the data drops nobody. A selector shows only when the
 * listed entries could be narrowed by it, so a directory that stores no facets
 * shows none, with no configuration.
 */
export type Access = (typeof WHO_CAN_CONTACT)[number];

export interface FacetSelection {
	/** The patient's age in whole years; null is no age chosen. */
	age: number | null;
	/** What the patient, or the professional asking, can do: see ACCESS below. */
	access: Access | null;
	accessModes: EntryFacets['access_modes'] & {};
	careLevels: EntryFacets['care_levels'] & {};
	audiences: EntryFacets['audiences'] & {};
	free: boolean;
	anonymous: boolean;
}

export const NO_FACETS: FacetSelection = {
	age: null,
	access: null,
	accessModes: [],
	careLevels: [],
	audiences: [],
	free: false,
	anonymous: false
};

/** The selectors, in the order a professional with a patient uses them. */
const ORDER = ['age', 'access', 'accessModes', 'careLevels', 'audiences', 'free', 'anonymous'] as const;
export type SelectorKey = (typeof ORDER)[number];

/**
 * What each choice of the access selector reaches. A patient alone reaches what is open
 * to anyone; a patient with a doctor's letter also reaches what needs one; what is
 * reserved to professionals (coordination, téléexpertise, a resource centre) is its own
 * choice, not a superset of the others.
 */
const ACCESS: Record<Access, readonly Access[]> = {
	anyone: ['anyone'],
	referral: ['anyone', 'referral'],
	professionals: ['professionals']
};

const VOCABULARY = {
	accessModes: ACCESS_MODES,
	careLevels: CARE_LEVELS,
	audiences: AUDIENCES,
	access: WHO_CAN_CONTACT
} as const;

const FIELD = {
	accessModes: 'access_modes',
	careLevels: 'care_levels',
	audiences: 'audiences',
	access: 'who_can_contact'
} as const;

const inAgeRange = (entry: Entry, age: number) =>
	(entry.age_min == null || entry.age_min <= age) && (entry.age_max == null || age <= entry.age_max);

const anyOf = (known: readonly string[] | null | undefined, chosen: readonly string[]) =>
	!chosen.length || known == null || chosen.some((value) => known.includes(value));

/** The entries every chosen selector lets through; an entry's unknown facet always passes. */
export const filterByFacets = (entries: Entry[], selection: FacetSelection): Entry[] => {
	const { age, access, accessModes, careLevels, audiences, free, anonymous } = selection;
	if (age === null && access === null && !accessModes.length && !careLevels.length && !audiences.length && !free && !anonymous) {
		return entries;
	}
	return entries.filter(
		(entry) =>
			(age === null || inAgeRange(entry, age)) &&
			(access === null || entry.who_can_contact == null || ACCESS[access].includes(entry.who_can_contact)) &&
			anyOf(entry.access_modes, accessModes) &&
			anyOf(entry.care_levels, careLevels) &&
			anyOf(entry.audiences, audiences) &&
			(!free || entry.free !== false) &&
			(!anonymous || entry.anonymous_care !== false)
	);
};

const valuesOf = (entry: Entry, key: keyof typeof FIELD): string[] => {
	const stored = entry[FIELD[key]];
	return stored == null ? [] : Array.isArray(stored) ? stored : [stored];
};

/** The values of a selector that the entries carry, in the vocabulary's order, with how many entries carry each. */
export const optionsOf = (entries: Entry[], key: keyof typeof FIELD): { value: string; count: number }[] => {
	const counts = new Map<string, number>();
	for (const entry of entries) {
		for (const value of new Set(valuesOf(entry, key))) {
			counts.set(value, (counts.get(value) ?? 0) + 1);
		}
	}
	return (VOCABULARY[key] as readonly string[])
		.filter((value) => counts.has(value))
		.map((value) => ({ value, count: counts.get(value)! }));
};

const distinct = (entries: Entry[], key: keyof typeof FIELD) => optionsOf(entries, key).length;

const distinctBooleans = (entries: Entry[], field: 'free' | 'anonymous_care') =>
	new Set(entries.map((entry) => entry[field]).filter((value) => value != null)).size;

/** The selectors that could narrow these entries, in the order they are used. */
export const selectorsShown = (entries: Entry[]): SelectorKey[] =>
	ORDER.filter((key) => {
		switch (key) {
			case 'age':
				return entries.some((entry) => entry.age_min != null || entry.age_max != null);
			case 'free':
				return distinctBooleans(entries, 'free') > 1;
			case 'anonymous':
				return distinctBooleans(entries, 'anonymous_care') > 1;
			default:
				return distinct(entries, key) > 1;
		}
	});

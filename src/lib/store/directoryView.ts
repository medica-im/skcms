/**
 * The address book's business logic, behind one function.
 *
 * `directoryView` answers the only question the UI actually asks: given a
 * directory and a set of selections, *what does the user see* — which entries,
 * grouped how, and what may still be chosen next.
 *
 * It exists so the behaviour can be specified without naming the pieces that
 * currently implement it. `directoryView.spec.ts` is written against this
 * signature alone; the body below is free to be rewritten — folded into one
 * derivation, moved into a class, reshaped for a newer Svelte — and the specs
 * stay the record of what the address book must keep doing.
 *
 * That is the point: the existing directoryStore.test.ts pins
 * `filteredEntriesF(...)` and friends *by name*, so a rewrite that changes the
 * shape of the chain invalidates the very tests meant to protect it. These
 * do not.
 *
 * Nothing here is reactive. Reactivity is a separate contract, tested
 * separately, and genuinely Svelte-version-specific — see
 * CtxDirectory.svelte.test.ts.
 */
import {
	fullFilteredEntriesF,
	filteredEntriesF,
	categorizedFilteredEffectorsF,
	categoryOfF,
	communeOfF,
	departmentOfF,
	facilityOfF,
	tagOfF,
	distanceEffectorsF
} from './directoryStore.ts';
import type {
	Entry,
	Situation,
	Tag,
	Type,
	AddressFeature,
	CategorizedEntries
} from './directoryStoreInterface.ts';
import type { Organization } from '$lib/interfaces/organization.ts';
import type { FacilityOf } from '$lib/interfaces/facility.interface.ts';
import type { SelectType } from '$lib/interfaces/select';

/** Everything the user can pick. Every field optional: omitted means unset. */
export type Selections = {
	/** Context-level, set by the page rather than a dropdown. */
	situation?: SelectType | null;
	currentOrg?: boolean | null;
	limitCategories?: string[];
	active?: boolean | null;
	/** The selectors proper. */
	categories?: string[];
	department?: { label: string; value: string } | null;
	communes?: string[];
	facility?: string | null;
	term?: string;
	tags?: Tag[] | null;
};

export type DirectoryInput = {
	entries: Entry[];
	situations?: Situation[];
	organization?: Organization;
	/** When set, entries within each group are ordered by distance from it. */
	addressFeature?: AddressFeature | null;
};

export type DirectoryView = {
	/** The entries still in play, in order. */
	visible: Entry[];
	/** Those entries grouped by effector type, in display order. */
	groups: CategorizedEntries;
	/** What each selector may still offer, given the other selections. */
	options: {
		categories: Type[];
		communes: { uid: string; name: string }[];
		departments: string[];
		facilities: FacilityOf[];
		tags: Tag[];
	};
};

/**
 * `active` defaults to `true` — the address book hides inactive entries unless
 * asked. Passing `null` means "do not filter on active at all".
 */
export function directoryView(input: DirectoryInput, selections: Selections = {}): DirectoryView {
	const { entries, situations = [], organization, addressFeature = null } = input;
	const {
		situation = undefined,
		currentOrg = null,
		limitCategories = [],
		active = true,
		categories = [],
		department = null,
		communes = [],
		facility = null,
		term = '',
		tags = null
	} = selections;

	// Stage 1 — the context narrowing: what this page is about at all.
	const full = fullFilteredEntriesF(
		situations,
		entries,
		situation ?? undefined,
		currentOrg,
		organization,
		limitCategories,
		active
	);

	// Stage 2 — the selectors the user drives.
	const visible = filteredEntriesF(full, categories, department, communes, facility, term, tags);

	// Stage 3 — presentation: grouping and ordering.
	const distances = addressFeature ? distanceEffectorsF(entries, addressFeature) : null;
	const groups = categorizedFilteredEffectorsF(visible, distances, situation ?? undefined);

	// Stage 4 — what remains selectable. Each option list narrows on the
	// *other* selections, never on its own, so a choice never hides itself.
	const options = {
		categories: categoryOfF(full, communes, department, facility),
		communes: communeOfF(full, categories, department, facility),
		departments: departmentOfF(full, facility, categories, communes),
		facilities: facilityOfF(full, categories, communes, department),
		tags: tagOfF(full, facility, categories, communes, department)
	};

	return { visible, groups, options };
}

/** Convenience for assertions: the names on show, in order. */
export function visibleNames(view: DirectoryView): string[] {
	return view.visible.map((e) => e.name);
}

/** Convenience for assertions: group labels in display order. */
export function groupNames(view: DirectoryView): string[] {
	return [...view.groups.keys()];
}

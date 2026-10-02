/**
 * How a facility reads in the facility select, and what its search matches.
 * The rules and why: see facilityOption.test.ts.
 */
import type { FacilityV2 } from '$lib/interfaces/v2/facility.ts';
import { normalize } from '$lib/helpers/stringHelpers.ts';

/**
 * The facility's name or, unnamed, the people working there, then its label.
 * Never its uid: with none of these the line starts with the address.
 */
export function facilityName(facility: FacilityV2): string | undefined {
	const name = facility.name?.trim();
	if (name) return name;
	if (facility.effectors?.length) {
		const count = facility.effectors.length;
		return `${count} effecteur${count > 1 ? 's' : ''}: ${facility.effectors.join(', ')}`;
	}
	return facility.label?.trim() || undefined;
}

/**
 * "Name, street, commune, département", leaving out what the user has
 * already narrowed the list to.
 */
export function facilityOptionLabel(
	facility: FacilityV2,
	selected: { department?: boolean; commune?: boolean } = {}
): string {
	const parts = [
		facilityName(facility),
		facility.street?.trim(),
		selected.commune ? undefined : facility.commune?.name_fr,
		selected.commune || selected.department ? undefined : facility.commune?.department?.name
	];
	return parts.filter((part) => part).join(', ');
}

/** What the search matches: the displayed string and the facility's label. */
export function facilitySearchText(facility: FacilityV2, label: string): string {
	const extra = facility.label?.trim();
	return extra ? `${label} ${extra}` : label;
}

/** Lower case, no accents, hyphens and apostrophes as spaces. */
const fold = (s: string) =>
	normalize(s).replace(/[-'’]/g, ' ');

/**
 * Every word typed appears somewhere in the search text, in any order, as a
 * whole or as the start of what is being typed. Nothing typed matches all.
 */
export function facilityMatches(searchText: string, query: string): boolean {
	const words = fold(query).split(/\s+/).filter(Boolean);
	const text = fold(searchText);
	return words.every((word) => text.includes(word));
}

import { error } from '@sveltejs/kit';
import { filterEntries } from './directory.ts';
import { genderedLabel } from '$lib/store/directoryStore.ts';
import type { Entry } from '$lib/store/directoryStoreInterface';
import type { Labels } from '$lib/interfaces/label.interace.ts';

/**
 * The data for /annuaire/[slug]: the organization's members of one effector
 * type. 404 when no member has that type — a person's name typed after
 * /annuaire/ included.
 */
export function effectorTypePage(
	slug: string,
	{ organization, entries, labels }: { organization: { uid: string }; entries: Entry[]; labels: Labels }
) {
	const members = filterEntries(entries, true, organization.uid) ?? [];
	const uid = members.find((e) => e.effector_type.slug == slug)?.effector_type.uid;
	if (uid === undefined) error(404, 'Not found');
	const types = [uid];
	const filtered = filterEntries(members, null, null, types) ?? [];
	return {
		entries: filtered,
		slug,
		types,
		label: genderedLabel(filtered, labels, slug)
	};
}

/**
 * An entry page's canonical address, title and description.
 * See entryMeta.test.ts for why each is built the way it is.
 */
import { buttonLabel } from '$lib/Organization/occupationLabel';

/** What the page knows of an entry: the full entry, plus the list's raw_label and department. */
export interface EntryMetaSource {
	name: string;
	effector_type: { label: string | null; name?: string | null; raw_label?: string | null };
	facility?: { name?: string | null } | null;
	address?: { city?: string | null } | null;
	department?: { code?: string | null } | null;
}

/** The public address of an entry page: never the backend's host. */
export const entryCanonicalUrl = (origin: string, base: string, slug: string) =>
	`${origin}${base}/e/${slug}`;

/** The gendered label, or the type's name when it has none (label is nullable). */
const fullOccupation = ({ label, name }: EntryMetaSource['effector_type']) => label || name || '';

/** Short, for a tab and a search result headline: who, what, where. */
export function entryTitle(entry: EntryMetaSource): string {
	const { name, raw_label } = entry.effector_type;
	const occupation = buttonLabel(fullOccupation(entry.effector_type), name, raw_label);
	const city = entry.address?.city;
	return `${entry.name}, ${occupation}${city ? ` à ${city}` : ''}`;
}

/** The full occupation, then the facility and the place. */
export function entryDescription(entry: EntryMetaSource): string {
	const city = entry.address?.city;
	const department = entry.department?.code;
	const place = [entry.facility?.name, city && department ? `${city} (${department})` : city]
		.filter(Boolean)
		.join(', ');
	return `${entry.name}, ${fullOccupation(entry.effector_type)}${place ? ` — ${place}` : ''}.`;
}

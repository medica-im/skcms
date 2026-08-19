/**
 * Sorting and counting for the administrative entries table.
 *
 * Kept out of the component so it can be tested without a DOM, and because
 * everything here has a wrong answer that looks plausible: a missing date
 * sorted as 1970, an accent sorted after Z, an entry counted as owned because
 * somebody created it.
 */

export type AdminUser = {
	uid: string;
	name: string | null;
};

export type AdminEntry = {
	uid: string;
	slug: string | null;
	name: string | null;
	active: boolean;
	/** Milliseconds since the epoch, like every timestamp in this project. */
	createdAt: number | null;
	/** The graph node's own last write: access level, tags, memberships… */
	updatedAt: number | null;
	/** The most recent edit to the Postgres contact rows: phones, emails… */
	contactUpdatedAt: number | null;
	deactivation_reason: string | null;
	deactivation_datetime: string | null;
	access: string;
	effector_type: { uid: string; name: string | null; slug: string | null } | null;
	facility: { uid: string; name: string | null; slug: string | null } | null;
	directories: string[];
	creators: AdminUser[];
	owners: AdminUser[];
};

export type SortColumn = 'name' | 'createdAt' | 'lastModified' | 'active' | 'type' | 'facility';
export type SortDirection = 'asc' | 'desc';

/**
 * When this entry was last changed, across both stores.
 *
 * An entry's data is split: the graph node holds the access level, tags and
 * memberships, while phones, emails, websites and the avatar are Postgres rows
 * hanging off a Contact. Editing either leaves the other untouched, so neither
 * timestamp alone answers the question and the later of the two is the answer.
 *
 * Null when neither has ever been stamped — the column shows a dash rather
 * than inventing a date.
 */
export function lastModifiedOf(entry: AdminEntry): number | null {
	const stamps = [entry.updatedAt, entry.contactUpdatedAt].filter(
		(s): s is number => typeof s === 'number'
	);
	return stamps.length ? Math.max(...stamps) : null;
}

const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });

function compare(a: AdminEntry, b: AdminEntry, column: SortColumn): number {
	switch (column) {
		case 'name':
			// Intl.Collator, not <: "Élodie" sorts after "Zoé" under a
			// codepoint comparison, which is wrong in every language this
			// directory is written in.
			return collator.compare(a.name ?? '', b.name ?? '');
		case 'type':
			return collator.compare(a.effector_type?.name ?? '', b.effector_type?.name ?? '');
		case 'facility':
			return collator.compare(a.facility?.name ?? '', b.facility?.name ?? '');
		case 'active':
			return Number(a.active) - Number(b.active);
		case 'createdAt':
			return numeric(a.createdAt, b.createdAt);
		case 'lastModified':
			return numeric(lastModifiedOf(a), lastModifiedOf(b));
	}
}

/**
 * Compare two timestamps, either of which may be missing.
 *
 * Returns NaN-free ordering with nulls treated as "no answer" rather than as
 * zero — the caller pushes them to the end regardless of direction.
 */
function numeric(a: number | null, b: number | null): number {
	if (a === null && b === null) return 0;
	if (a === null) return 1;
	if (b === null) return -1;
	return a - b;
}

/**
 * Sort a copy of `entries`.
 *
 * A copy, because the table re-sorts on every header click while Svelte's
 * `$derived` reads the same source array; sorting in place would reorder the
 * data under the runtime and produce a view that disagrees with itself.
 *
 * Entries with no value for the sorted column always go last, whichever
 * direction is asked for. Sorting a missing date as 1970 would claim it is the
 * oldest entry in the directory, which is a statement rather than an absence —
 * and entries predating the createdAt trigger have no date at all.
 */
export function sortEntries(
	entries: AdminEntry[],
	column: SortColumn,
	direction: SortDirection
): AdminEntry[] {
	const missing = (e: AdminEntry) =>
		column === 'createdAt'
			? e.createdAt === null
			: column === 'lastModified'
				? lastModifiedOf(e) === null
				: false;

	return [...entries].sort((a, b) => {
		const aMissing = missing(a);
		const bMissing = missing(b);
		if (aMissing !== bMissing) return aMissing ? 1 : -1;
		if (aMissing && bMissing) return 0;
		const result = compare(a, b, column);
		return direction === 'asc' ? result : -result;
	});
}

export type Summary = {
	total: number;
	active: number;
	inactive: number;
	withoutOwner: number;
};

/**
 * The figures above the table.
 *
 * `withoutOwner` is the one worth having: an entry nobody owns is an entry
 * nobody can edit, and it is invisible everywhere else in the application.
 * Note that a creator is not an owner — creating an entry does not confer the
 * right to maintain it — so an entry with a creator and no owner still counts.
 */
export function summarise(entries: AdminEntry[]): Summary {
	return {
		total: entries.length,
		active: entries.filter((e) => e.active).length,
		inactive: entries.filter((e) => !e.active).length,
		withoutOwner: entries.filter((e) => e.owners.length === 0).length
	};
}

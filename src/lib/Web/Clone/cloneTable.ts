/** Sorting, paging and identity for the clone source list. */

export type SourceEntry = {
	uid: string;
	name?: string;
	entrySlug?: string;
	effector_type?: { name?: string; label?: string };
	facility?: { name?: string; label?: string; slug?: string };
	address?: { street?: string; zip?: string; city?: string };
	avatar?: { sm?: string; raw?: string } | null;
	createdAt?: number;
	updatedAt?: number;
	contactUpdatedAt?: number;
	active?: boolean;
};

export type CloneSortColumn = 'name' | 'type' | 'facility' | 'createdAt' | 'lastModified';
export type SortDirection = 'asc' | 'desc';

/**
 * How many entries to show before paging.
 *
 * A directory of thirty is a page; a directory of six hundred is a scroll with
 * no end, and every row carries a checkbox somebody might have to find again.
 * Editable rather than fixed because "how many is too many" depends on the
 * directory, not on us.
 */
export const DEFAULT_PAGE_SIZE = 50;

/** The most recent of the timestamps an entry carries. */
export function lastModifiedOf(entry: SourceEntry): number | null {
	const stamps = [entry.updatedAt, entry.contactUpdatedAt].filter(
		(s): s is number => typeof s === 'number'
	);
	return stamps.length ? Math.max(...stamps) : null;
}

/** The address as one line, or empty when the entry carries none. */
export function addressLine(entry: SourceEntry): string {
	const a = entry.address ?? {};
	return [a.street, [a.zip, a.city].filter(Boolean).join(' ')]
		.filter((part) => part && part.trim())
		.join(', ');
}

const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });

function value(entry: SourceEntry, column: CloneSortColumn): string | number | null {
	switch (column) {
		case 'name':
			return entry.name ?? '';
		case 'type':
			return entry.effector_type?.label ?? entry.effector_type?.name ?? '';
		case 'facility':
			return entry.facility?.name ?? entry.facility?.label ?? '';
		case 'createdAt':
			return entry.createdAt ?? null;
		case 'lastModified':
			return lastModifiedOf(entry);
	}
}

export function sortEntries(
	entries: SourceEntry[],
	column: CloneSortColumn,
	direction: SortDirection
): SourceEntry[] {
	const sign = direction === 'asc' ? 1 : -1;
	return [...entries].sort((a, b) => {
		const x = value(a, column);
		const y = value(b, column);
		// Entries with no date sort last whichever way the column points: a
		// missing timestamp is not "the oldest", it is unknown.
		if (x === null && y === null) return 0;
		if (x === null) return 1;
		if (y === null) return -1;
		if (typeof x === 'number' && typeof y === 'number') return (x - y) * sign;
		return collator.compare(String(x), String(y)) * sign;
	});
}

/** The slice to show, and how many pages there are. */
export function paginate<T>(rows: T[], page: number, size: number) {
	const total = Math.max(1, Math.ceil(rows.length / Math.max(1, size)));
	const current = Math.min(Math.max(1, page), total);
	const start = (current - 1) * size;
	return { rows: rows.slice(start, start + size), page: current, pages: total };
}

/**
 * Whether every selectable entry on this page is already ticked.
 *
 * "Selectable" excludes the ones that already exist here — a select-all that
 * ticked rows the user cannot act on would report a selection larger than what
 * the next step can do.
 */
export function allSelected(
	rows: SourceEntry[],
	selected: string[],
	existing: Record<string, string>
): boolean {
	const selectable = rows.filter((r) => !existing[r.uid]);
	return selectable.length > 0 && selectable.every((r) => selected.includes(r.uid));
}

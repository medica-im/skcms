/**
 * Ordering by date and time, for every date-time column in the frontend: full
 * timestamps are compared, so two rows of the same day keep their order.
 * The rule and why it is one rule: see dateTimeSort.test.ts.
 */

export type SortDirection = 'asc' | 'desc';

/** What a date comes as here: milliseconds (the graph), an ISO string (the API), or a Date. */
export type DateTimeValue = number | string | Date | null | undefined;

/** Milliseconds since the epoch, or null when there is no readable date. */
export function toTime(value: DateTimeValue): number | null {
	if (value === null || value === undefined || value === '') return null;
	const time = value instanceof Date ? value.getTime() : typeof value === 'number' ? value : Date.parse(value);
	return Number.isNaN(time) ? null : time;
}

/**
 * A sort comparator: oldest first ('asc') or newest first ('desc'), with a
 * missing date last in both directions. Usable on its own inside a larger
 * comparator, as the entries table does for its date columns.
 */
export function compareDateTimes(a: DateTimeValue, b: DateTimeValue, direction: SortDirection): number {
	const ta = toTime(a);
	const tb = toTime(b);
	if (ta === null || tb === null) return ta === null ? (tb === null ? 0 : 1) : -1;
	return direction === 'asc' ? ta - tb : tb - ta;
}

/** A sorted copy of `items`, by the date `dateOf` reads from each. */
export function sortByDateTime<T>(items: T[], dateOf: (item: T) => DateTimeValue, direction: SortDirection): T[] {
	return [...items].sort((a, b) => compareDateTimes(dateOf(a), dateOf(b), direction));
}

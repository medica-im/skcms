import type { SortDirection } from '$lib/utils/dateTimeSort';

export type { SortDirection };

/**
 * The aria-sort value for a sortable column's header CELL -- the <th>, or the
 * element with role="columnheader" in a grid laid out without a table. It is
 * not the button's: aria-sort is only valid on a column header.
 */
export const ariaSort = (active: boolean, direction: SortDirection) =>
	!active ? 'none' : direction === 'asc' ? 'ascending' : 'descending';

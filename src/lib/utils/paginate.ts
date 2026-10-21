/** Paging a list in the browser, and reading where it stands from the address. */

/** The page sizes a list offers; the first is the default. */
export const PAGE_SIZES = [50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

/** The slice to show, and how many pages there are. */
export function paginate<T>(rows: T[], page: number, size: number) {
	const total = Math.max(1, Math.ceil(rows.length / Math.max(1, size)));
	const current = Math.min(Math.max(1, page), total);
	const start = (current - 1) * size;
	return { rows: rows.slice(start, start + size), page: current, pages: total };
}

/** A page number from ?page=, or 1. Past the end is paginate's to clamp. */
export function pageFromParam(value: string | null): number {
	const page = Number(value);
	return Number.isInteger(page) && page >= 1 ? page : 1;
}

/** A page size from ?par=, or the default when it is not one offered. */
export function pageSizeFromParam(value: string | null): PageSize {
	const size = Number(value);
	return PAGE_SIZES.find((offered) => offered === size) ?? PAGE_SIZES[0];
}

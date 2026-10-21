import { describe, it, expect } from 'vitest';
import { paginate, pageFromParam, pageSizeFromParam, PAGE_SIZES } from './paginate';

describe('paginate', () => {
	const rows = Array.from({ length: 120 }, (_, i) => i);

	it('shows everything on one page when it fits', () => {
		expect(paginate(rows.slice(0, 40), 1, 50).rows).toHaveLength(40);
		expect(paginate(rows.slice(0, 40), 1, 50).pages).toBe(1);
	});

	it('splits at the threshold', () => {
		expect(paginate(rows, 1, 50).rows).toHaveLength(50);
		expect(paginate(rows, 3, 50).rows).toHaveLength(20);
		expect(paginate(rows, 3, 50).pages).toBe(3);
	});

	it('clamps a page number past the end', () => {
		// Raising the page size while on page 5 must not show a blank table.
		expect(paginate(rows, 99, 50).page).toBe(3);
	});
});

describe('pageFromParam', () => {
	it('reads a page number from the address', () => {
		expect(pageFromParam('3')).toBe(3);
	});

	it.each([null, '', 'abc', '0', '-2', '1.5'])('starts at page 1 for %j', (value) => {
		expect(pageFromParam(value)).toBe(1);
	});
});

describe('pageSizeFromParam', () => {
	it('offers 50 and 100 rows a page', () => {
		expect(PAGE_SIZES).toEqual([50, 100]);
	});

	it('reads one of the offered sizes', () => {
		expect(pageSizeFromParam('100')).toBe(100);
	});

	it.each([null, '', '20', '5000', 'abc'])('falls back to 50 for %j', (value) => {
		expect(pageSizeFromParam(value)).toBe(50);
	});
});

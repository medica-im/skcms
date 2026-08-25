import { describe, it, expect } from 'vitest';
import {
	sortEntries, paginate, lastModifiedOf, addressLine, allSelected,
	type SourceEntry
} from './cloneTable';

const e = (over: Partial<SourceEntry> = {}): SourceEntry => ({
	uid: 'u1', name: 'Someone', ...over
});

describe('lastModifiedOf', () => {
	it('takes the most recent stamp an entry carries', () => {
		expect(lastModifiedOf(e({ updatedAt: 10, contactUpdatedAt: 20 }))).toBe(20);
	});

	it('is null when the entry has never been touched', () => {
		// Not 0: a missing timestamp is unknown, and 0 would sort as 1970.
		expect(lastModifiedOf(e())).toBeNull();
	});
});

describe('addressLine', () => {
	it('reads as one line', () => {
		expect(addressLine(e({ address: { street: '10 Cours Lafayette', zip: '69003', city: 'Lyon' } })))
			.toBe('10 Cours Lafayette, 69003 Lyon');
	});

	it('is empty rather than punctuation when there is no address', () => {
		expect(addressLine(e())).toBe('');
		expect(addressLine(e({ address: {} }))).toBe('');
	});
});

describe('sortEntries', () => {
	it('sorts names the way French readers expect', () => {
		const rows = [e({ uid: 'b', name: 'Zoé' }), e({ uid: 'a', name: 'Émile' })];
		expect(sortEntries(rows, 'name', 'asc').map((r) => r.uid)).toEqual(['a', 'b']);
	});

	it('puts entries with no date last in both directions', () => {
		// Otherwise a missing timestamp reads as 1970 and floods the top of a
		// "newest first" list with entries nobody has ever edited.
		const rows = [e({ uid: 'none' }), e({ uid: 'dated', createdAt: 5 })];
		expect(sortEntries(rows, 'createdAt', 'desc').map((r) => r.uid)).toEqual(['dated', 'none']);
		expect(sortEntries(rows, 'createdAt', 'asc').map((r) => r.uid)).toEqual(['dated', 'none']);
	});
});

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

describe('allSelected', () => {
	const existing = { dup: '/e/already-here' };

	it('ignores entries that already exist here', () => {
		// They cannot be cloned, so a select-all that counted them would promise
		// more than the next step can do.
		const rows = [e({ uid: 'a' }), e({ uid: 'dup' })];
		expect(allSelected(rows, ['a'], existing)).toBe(true);
	});

	it('is false when nothing on the page can be selected', () => {
		expect(allSelected([e({ uid: 'dup' })], [], existing)).toBe(false);
	});
});

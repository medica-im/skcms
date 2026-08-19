import { describe, it, expect } from 'vitest';
import {
	sortEntries,
	summarise,
	lastModifiedOf,
	type AdminEntry
} from './entriesTable';

/**
 * The administrative entries table: sorting, counting, and what "modified" means.
 *
 * This is the logic behind /web/entries, the page administrators and
 * superusers use to audit the directory. The component around it is a table;
 * everything worth getting wrong lives here, so it is pure and tested without
 * a DOM.
 *
 * Sorting is client-side deliberately. The endpoint returns every entry in the
 * directory — at most 223 in production — so re-sorting is instant and a
 * server round trip per header click would be slower and no more correct.
 *
 * The cases below are the ones that bite:
 *
 * - a null timestamp is not "the beginning of time". Entries predating the
 *   createdAt trigger have none, and sorting them as 0 buries them under every
 *   real entry in ascending order while claiming they are the oldest.
 * - "no owner" is the column an administrator actually scans for, because an
 *   entry nobody owns is one nobody can edit.
 * - last-modified spans two stores: the graph node's updatedAt and the
 *   Postgres contact rows. The larger of the two is the answer; neither alone
 *   is.
 */

const entry = (over: Partial<AdminEntry> = {}): AdminEntry => ({
	uid: 'uid-1',
	slug: 'jean-dupont-mg-69',
	name: 'Jean Dupont',
	active: true,
	createdAt: 1_700_000_000_000,
	updatedAt: 1_700_000_000_000,
	contactUpdatedAt: null,
	deactivation_reason: null,
	deactivation_datetime: null,
	access: 'anonymous',
	effector_type: { uid: 'et-1', name: 'médecin généraliste', slug: 'mg' },
	facility: { uid: 'f-1', name: 'Cabinet du Centre', slug: 'cabinet-du-centre' },
	directories: ['santelyon3'],
	creators: [{ uid: 'u-1', name: 'Marie Martin' }],
	owners: [{ uid: 'u-1', name: 'Marie Martin' }],
	...over
});

describe('sortEntries', () => {
	it('orders by creation date, newest first', () => {
		const older = entry({ uid: 'older', createdAt: 1_000 });
		const newer = entry({ uid: 'newer', createdAt: 2_000 });

		const sorted = sortEntries([older, newer], 'createdAt', 'desc');

		expect(sorted.map((e) => e.uid)).toEqual(['newer', 'older']);
	});

	it('reverses to chronological order', () => {
		const older = entry({ uid: 'older', createdAt: 1_000 });
		const newer = entry({ uid: 'newer', createdAt: 2_000 });

		const sorted = sortEntries([newer, older], 'createdAt', 'asc');

		expect(sorted.map((e) => e.uid)).toEqual(['older', 'newer']);
	});

	it('does not mutate the array it was given', () => {
		// The table re-sorts on every header click while $derived reads the
		// same source array; sorting in place would scramble it under Svelte.
		const entries = [entry({ uid: 'a', createdAt: 2 }), entry({ uid: 'b', createdAt: 1 })];

		sortEntries(entries, 'createdAt', 'asc');

		expect(entries.map((e) => e.uid)).toEqual(['a', 'b']);
	});

	it('puts entries with no date last, whichever way it is sorted', () => {
		// Not 0. An entry predating the createdAt trigger has no date at all,
		// and treating that as 1970 claims it is the oldest thing in the
		// directory — which is a statement, not an absence.
		const dated = entry({ uid: 'dated', createdAt: 1_000 });
		const undated = entry({ uid: 'undated', createdAt: null });

		expect(sortEntries([undated, dated], 'createdAt', 'desc').map((e) => e.uid)).toEqual([
			'dated',
			'undated'
		]);
		expect(sortEntries([undated, dated], 'createdAt', 'asc').map((e) => e.uid)).toEqual([
			'dated',
			'undated'
		]);
	});

	it('sorts by name alphabetically, accents folded', () => {
		const a = entry({ uid: 'a', name: 'Zoé Martin' });
		const b = entry({ uid: 'b', name: 'Élodie Bernard' });

		const sorted = sortEntries([a, b], 'name', 'asc');

		// É sorts with E, not after Z, which a naive codepoint comparison does.
		expect(sorted.map((e) => e.uid)).toEqual(['b', 'a']);
	});

	it('sorts by last modification', () => {
		const stale = entry({ uid: 'stale', updatedAt: 1_000 });
		const fresh = entry({ uid: 'fresh', updatedAt: 5_000 });

		const sorted = sortEntries([stale, fresh], 'lastModified', 'desc');

		expect(sorted.map((e) => e.uid)).toEqual(['fresh', 'stale']);
	});

	it('sorts inactive entries apart from active ones', () => {
		const active = entry({ uid: 'active', active: true });
		const inactive = entry({ uid: 'inactive', active: false });

		const sorted = sortEntries([active, inactive], 'active', 'asc');

		expect(sorted.map((e) => e.uid)).toEqual(['inactive', 'active']);
	});
});

describe('lastModifiedOf', () => {
	it('takes the graph timestamp when there is no contact data', () => {
		expect(lastModifiedOf(entry({ updatedAt: 5_000, contactUpdatedAt: null }))).toBe(5_000);
	});

	it('takes the contact timestamp when it is the later of the two', () => {
		// Editing a phone number writes a Postgres row and leaves the graph
		// node alone, so the node's own updatedAt says nothing about it.
		expect(lastModifiedOf(entry({ updatedAt: 1_000, contactUpdatedAt: 9_000 }))).toBe(9_000);
	});

	it('takes the graph timestamp when it is the later of the two', () => {
		// And the reverse: changing the access level touches the node and no
		// Postgres row at all.
		expect(lastModifiedOf(entry({ updatedAt: 9_000, contactUpdatedAt: 1_000 }))).toBe(9_000);
	});

	it('is null when neither side has ever been stamped', () => {
		expect(lastModifiedOf(entry({ updatedAt: null, contactUpdatedAt: null }))).toBeNull();
	});
});

describe('summarise', () => {
	it('counts the entries an administrator scans for', () => {
		const entries = [
			entry({ uid: '1', active: true, owners: [{ uid: 'u', name: 'x' }] }),
			entry({ uid: '2', active: false, owners: [{ uid: 'u', name: 'x' }] }),
			entry({ uid: '3', active: true, owners: [] })
		];

		expect(summarise(entries)).toEqual({
			total: 3,
			active: 2,
			inactive: 1,
			withoutOwner: 1
		});
	});

	it('counts an entry with no owner even when it has a creator', () => {
		// Creating an entry does not confer the right to edit it. An entry
		// with a creator and no owner is exactly the case worth surfacing:
		// somebody made it and nobody can now maintain it.
		const orphan = entry({ owners: [], creators: [{ uid: 'u-1', name: 'Marie' }] });

		expect(summarise([orphan]).withoutOwner).toBe(1);
	});

	it('answers zeroes for an empty directory rather than dividing by nothing', () => {
		expect(summarise([])).toEqual({ total: 0, active: 0, inactive: 0, withoutOwner: 0 });
	});
});

/**
 * Who a page lists under a role, found by the role rather than by name.
 *
 * A page naming its contact by slug breaks when that person leaves: their entry
 * goes inactive and the slug 404s (polypathologie on sante-gadagne.fr). Asking
 * for the active entries of an effector type follows the team as it changes.
 *
 * The type is matched on its French name, the key the console keeps identical
 * on every backend. Its uid differs from one Neo4j server to the next, and its
 * slug is an attribute the console may rewrite.
 */
import { describe, it, expect } from 'vitest';
import { entrySlugsOfType } from './entry';
import type { Entry } from '$lib/store/directoryStoreInterface';

const entry = (entrySlug: string, typeName: string, active: boolean | null = true) =>
	({ entrySlug, active, effector_type: { name: typeName, slug: `${typeName}-slug` } }) as unknown as Entry;

describe('entrySlugsOfType', () => {
	it('finds every active entry of the type', () => {
		const entries = [
			entry('anne-coordo-84', 'coordinateur'),
			entry('paul-mg-84', 'médecin généraliste'),
			entry('lea-coordo-84', 'coordinateur')
		];
		expect(entrySlugsOfType(entries, 'coordinateur')).toEqual(['anne-coordo-84', 'lea-coordo-84']);
	});

	it('leaves out an entry no longer active, whose page would 404', () => {
		const entries = [entry('virginie-reusser-coordo-84', 'coordinateur', false), entry('lea-coordo-84', 'coordinateur')];
		expect(entrySlugsOfType(entries, 'coordinateur')).toEqual(['lea-coordo-84']);
	});

	it('finds nobody on a site without the type', () => {
		expect(entrySlugsOfType([entry('paul-mg-84', 'médecin généraliste')], 'coordinateur')).toEqual([]);
		expect(entrySlugsOfType(undefined, 'coordinateur')).toEqual([]);
	});
});

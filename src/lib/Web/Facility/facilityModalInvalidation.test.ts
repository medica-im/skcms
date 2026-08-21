import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * A saved facility edit must refresh the entries, so the map moves at once.
 *
 * The directory map plots each entry's own coordinates —
 * createEntriesMapData in $lib/components/Map/mapData.ts reads
 * entry.address.latitude/longitude — and those entries come from the root
 * layout's load, which declares `depends('app:entries')`. So correcting a
 * facility's GPS in the modal on /sites/{slug} leaves every pin on the annuaire
 * at the old position until something re-runs that load.
 *
 * `invalidate('app:entries')` is what re-runs it, and it is the established
 * signal for exactly this: AvatarUploadModal, TagModal and AccessControl each
 * fire it after a successful write. This modal did not, so the coordinates were
 * saved and the map kept the old pin.
 *
 * Clearing the server cache is the other half and not a substitute: it makes
 * the *next* fetch correct, while this is what makes a fetch happen. Both are
 * needed, and the backend half is pinned in the API suite by
 * test_facility_edit_clears_the_entries_cache.py.
 *
 * Asserted against the source because what matters is that the call is wired
 * into the success path at all. Rendering the modal would need the remote
 * form, a live <dialog> and a geocoder store, and would mostly assert the
 * mocks — the risk here is a missing line, not a broken branch.
 */

const here = dirname(fileURLToPath(import.meta.url));
const read = (name: string) => readFileSync(resolve(here, name), 'utf8');

/** The body of the `enhance` callback the form submits through. */
function enhanceBody(source: string): string {
	const start = source.indexOf('.enhance(');
	if (start === -1) return '';
	let depth = 0;
	for (let i = source.indexOf('(', start); i < source.length; i++) {
		if (source[i] === '(') depth++;
		else if (source[i] === ')') {
			depth--;
			if (depth === 0) return source.slice(start, i + 1);
		}
	}
	return '';
}

describe('UpdateFacilityModal', () => {
	const source = read('UpdateFacilityModal.svelte');

	it('imports invalidate', () => {
		expect(source).toMatch(/import\s*\{[^}]*\binvalidate\b[^}]*\}\s*from\s*'\$app\/navigation'/);
	});

	it('invalidates app:entries when a submit succeeds', () => {
		const body = enhanceBody(source);
		expect(body, 'no enhance callback found on the update form').not.toBe('');
		expect(
			body,
			"a saved facility does not refresh the entries: the directory map keeps " +
				"the old pin until something re-runs the layout load. Fire " +
				"invalidate('app:entries') in the enhance callback, as " +
				'AvatarUploadModal and AccessControl do.'
		).toContain("invalidate('app:entries')");
	});

	it('does not rely on the close button to refresh the map', () => {
		// invalidateAll() on Fermer was the only refresh, so a user who saved
		// and navigated away — or reopened the dialog — never triggered it.
		// That call may stay; it must not be the only one.
		const body = enhanceBody(source);
		expect(body).toContain('app:entries');
	});
});

describe('the modals that already do this', () => {
	// Pinned so the convention is visible from here: if these stop invalidating,
	// the pattern this file enforces is no longer the house style and the
	// argument above needs revisiting rather than silently diverging.
	it.each([
		['../Avatar/AvatarUploadModal.svelte'],
		['../Entry/AccessControl.svelte'],
		['../Tag/TagModal.svelte']
	])('%s invalidates app:entries after a write', (path) => {
		expect(read(path)).toContain("invalidate('app:entries')");
	});
});

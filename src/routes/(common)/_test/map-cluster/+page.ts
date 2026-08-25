import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

/**
 * The fixture the server load returns, passed through unchanged.
 *
 * This used to mirror (skvar)/+page.ts — refetch on the client under PROD, then
 * allFacilities() to narrow the set to the ones this site's entries reference.
 * Both steps are wrong for a fixture:
 *
 *   - the refetch would replace the Lyon 3 dataset with whichever site is
 *     serving the page, which under Playwright is a worker site;
 *   - allFacilities() matches facility.entries against *this site's* entry
 *     uids, and no Lyon uid appears in a worker site's entries, so the filter
 *     would return an empty array and the map would draw nothing.
 *
 * The boundary still comes from the skvar submodule, guarded because it is not
 * present for every instance.
 */
export const load: PageLoad = async ({ data }) => {
	if (!dev) error(404, 'Not found');

	let geojson = null;
	try {
		const module = await import('../../../(skvar)/(var)/boundary.json');
		geojson = module.default;
	} catch {
		// boundary.json not present for this instance
	}

	return { facilities: data.facilities, geojson };
};

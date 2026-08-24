import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';
import { browser } from '$app/environment';
import type { PageLoad } from './$types';
import { fetchFacilities } from '$lib/Facility/facility.ts';
import { allFacilities } from '$lib/components/Directory/sites.ts';

/**
 * The facilities this site's home page would draw, loaded the way it loads
 * them.
 *
 * Mirrors (skvar)/+page.ts: the same fetchFacilities on the client in
 * production, the server's payload otherwise, then the same allFacilities()
 * filter so the set matches what <Facility> is really given. `organization`
 * and `entries` come from the shared layout, exactly as they do there.
 *
 * The boundary is loaded the same way too: a dynamic import guarded by
 * try/catch, since it lives in the skvar submodule and is not present for
 * every instance.
 */
export const load: PageLoad = async ({ data, parent, fetch }) => {
	if (!dev) error(404, 'Not found');

	const { organization, entries } = await parent();

	const fetched =
		browser && import.meta.env.PROD ? await fetchFacilities(fetch) : data.facilities;

	const facilities =
		organization?.uid && entries
			? allFacilities(fetched, entries, organization.uid, true)
			: fetched;

	let geojson = null;
	try {
		const module = await import('../../../(skvar)/(var)/boundary.json');
		geojson = module.default;
	} catch {
		// boundary.json not present for this instance
	}

	return { facilities, geojson };
};

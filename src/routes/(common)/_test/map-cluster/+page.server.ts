import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { fetchFacilities } from '$lib/Facility/facility.ts';

// The same server-side fetch the home page does — see (skvar)/+page.server.ts.
// Live data rather than a snapshot: an earlier version of this page pasted the
// API response in as literals, and the slugs went stale the moment
// dedupe_facility_slugs renamed them.
export const load: PageServerLoad = async ({ fetch }) => {
	if (!dev) error(404, 'Not found');
	return { facilities: await fetchFacilities(fetch) };
};

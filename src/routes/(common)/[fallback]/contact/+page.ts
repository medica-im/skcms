//import { websiteSchema } from '#lib/store/facilityStore.ts';
import { getOpenGraph } from '#lib/store/openGraphStore.ts';
import { ORIGIN } from '#lib/utils/origin.ts';
import { mspPostgres } from '#lib/constants.ts';
import { establishments } from '#lib/components/Directory/sites.ts';
import { fetchFacilities } from '#lib/Facility/facility.ts';
import type { EntryFull } from '#lib/store/directoryStoreInterface.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, params, parent }) => {
	const { organization, entries } = await parent();
	if (organization === undefined) throw new Error('organization undefined');
	let entry: EntryFull | undefined;
	const response = await fetch(`${ORIGIN}/api/v2/fullentries/${organization.uid}`);
	if (response.ok) {
		entry = await response.json();
	}
	// Only an MSP has a handful of establishments worth listing: a CPTS or a professional
	// organization has too many, and the list would help nobody.
	const places =
		organization.category.name === mspPostgres && entries !== undefined
			? establishments(await fetchFacilities(fetch), entries, organization.uid)
			: [];
	return {
		fullentry: entry,
		establishments: places
	};
};

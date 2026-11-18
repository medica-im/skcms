//import { websiteSchema } from '#lib/store/facilityStore.ts';
import { getOpenGraph } from '#lib/store/openGraphStore.ts';
import { ORIGIN } from '#lib/utils/origin.ts';
import type { EntryFull } from '#lib/store/directoryStoreInterface.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, params, parent }) => {
	const { organization } = await parent();
	if (organization === undefined) throw new Error('organization undefined');
	let entry: EntryFull | undefined;
	const response = await fetch(`${ORIGIN}/api/v2/fullentries/${organization.uid}`);
	if (response.ok) {
		entry = await response.json();
	}
	return {
		fullentry: entry
	};
};

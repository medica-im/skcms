//import { websiteSchema } from '$lib/store/facilityStore';
import { getOpenGraph } from '$lib/store/openGraphStore';
import { PUBLIC_ORIGIN as ORIGIN } from '$env/static/public';
import type { EntryFull } from '$lib/store/directoryStoreInterface';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, params, parent }) => {
    const { organization } = await parent();
    if (organization===undefined) throw new Error("organization undefined")
    let entry: EntryFull | undefined;
	const response = await fetch(`${ORIGIN}/api/v2/fullentries/${organization.uid}`);
	if (response.ok) {
		entry = await response.json();
	}
    return {
        fullentry: entry
    }
}
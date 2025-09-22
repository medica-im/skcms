import { websiteSchema } from '$lib/store/facilityStore.ts';
import { openGraphStore } from '$lib/store/openGraphStore.ts';
import { cardinalTypes } from '$lib/store/directoryStore.ts';
import { cardCatEntries } from '$lib/components/Directory/directory.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({parent}) => {
    const { organization } = await parent();
    const currentOrg: boolean|null = null;
    const orgUid = organization.uid;
    return {
        websiteSchema: await websiteSchema.load(),
        openGraph: await openGraphStore.load(),
        cardinalTypes: await cardinalTypes.load(),
        cardinal: await cardCatEntries(currentOrg, orgUid)
    };
}
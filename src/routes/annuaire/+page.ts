import { websiteSchema } from '$lib/store/facilityStore.ts';
import { cardCatEntries } from '$lib/components/Directory/directory.ts';
import { openGraphStore } from '$lib/store/openGraphStore.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({parent}) => {
    const { organization } = await parent();
    const currentOrg: boolean = true;
    const orgUid = organization.uid;
    return {
        //websiteSchema: await websiteSchema.load(),
        //occupationsCardinal: await occupationsCardinal.load(),
        //openGraph: await openGraphStore.load(),
        //workforceOccupation: await workforceOccupation.load(),
        //teamCarousel: await teamCarouselStore.load(),
        //ghost: data.ghost
        cardinal: await cardCatEntries(currentOrg, orgUid)
    };
}
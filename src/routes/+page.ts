import { websiteSchema } from '$lib/store/facilityStore.ts';
import { openGraphStore } from '$lib/store/openGraphStore.ts';
import type { PageLoad } from './$types';
import { cardinalTypes } from '$lib/store/directoryStore.ts';

export const load: PageLoad = async () => {
    return {
        websiteSchema: await websiteSchema.load(),
        openGraph: await openGraphStore.load(),
        cardinalTypes: await cardinalTypes.load(),
    };
}
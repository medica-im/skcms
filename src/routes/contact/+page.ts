import { organizationStore, websiteSchema } from '$lib/store/facilityStore';
import { openGraphStore } from '$lib/store/openGraphStore';
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = async ({ fetch, params }) => {
    const fData = await organizationStore.load();
    return {
        facility: fData,
    };
}
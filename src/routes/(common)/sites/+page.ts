import { getOpenGraph } from '$lib/store/openGraphStore';
import { allFacilityEntries, allFacilities } from '$lib/components/Directory/sites.ts';
import { fetchFacilities } from '$lib/Facility/facility.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ data, params, parent, fetch }) => {
    const { organization } = await parent();
    if (organization===undefined) throw new Error("organization undefined")
    const { entries } = await parent();
    if (entries===undefined) throw new Error("entries undefined")
    const { labels } = await parent();
    if ( labels === undefined ) throw new Error("labels undefined")
    const { directory } = await parent();
    if (directory===undefined) throw new Error("directory undefined")
    const facilities = await fetchFacilities(fetch);
    const currentOrg = directory.setting.display_facility_organization;
    const _allFacilities = allFacilities(facilities, entries, organization.uid, currentOrg);
    const _allFacilityEntries = allFacilityEntries(facilities, entries, organization.uid, labels, currentOrg);
    return {
        //websiteSchema: await websiteSchema.load(),
        facilities: _allFacilities || data.facilities,
        entryMap: _allFacilityEntries || data.entryMap
    };
}
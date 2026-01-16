import { PUBLIC_ORIGIN as ORIGIN } from '$env/static/public';
import { openGraphStore } from '$lib/store/openGraphStore';
import { allFacilityEntries, allFacilities } from '$lib/components/Directory/sites.ts';
import { error } from '@sveltejs/kit';
import type { Facility } from '$lib/interfaces/facility.interface.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, fetch }) => {
    const { organization } = await parent();
    if (organization===undefined) throw new Error("organization undefined")
    const { entries } = await parent();
    if (entries===undefined) throw new Error("entries undefined")
    const { labels } = await parent();
    if ( labels === undefined ) throw new Error("labels undefined")
    const { directory } = await parent();
    if (directory===undefined) throw new Error("directory undefined")
    const url = `${ORIGIN}/api/v1/facilities/?limit=300`;
    console.log("url", url);
    const response = await fetch(url,
        {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'content-type': 'application/json'
            }
        });
    if (!response.ok) {
            console.error(`/sites/ PageLoad fetch ${url} response status: ${response.status}`);
            error(response.status, {
                        message: 'Une erreur est survenue.',
                        code: response.status,
                        type: 'site'
                    });
        }
    const f: {facilities: Facility[]} = await response.json();
    const facilities: Facility[] = f.facilities;
    const currentOrg = directory.setting.display_facility_organization;
    const _allFacilities = allFacilities(facilities, entries, organization.uid, currentOrg);
    const _allFacilityEntries = allFacilityEntries(facilities, entries, organization.uid, labels, currentOrg);
    return {
        //websiteSchema: await websiteSchema.load(),
        facilities: _allFacilities,
        entryMap: _allFacilityEntries,
        organization: organization
    };
}
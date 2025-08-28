import type { PageLoad } from './$types';
import { variables } from '$lib/utils/constants';
import { facilityEntries } from '$lib/components/Directory/sites.ts';
import type { Facility } from '$lib/interfaces/facility.interface.ts';

export const load: PageLoad = async ({ params }) => {
    let facility: Facility|undefined;
    const slug = params.slug;
    const url = `${variables.BASE_API_URI}/facilities/${slug}/`;
    console.log(url);
    const response = await fetch(url,
        {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'content-type': 'application/json'
            }
        });
    if (!response.ok) {
        throw Error(`Response status: ${response.status}`);
    } else {
        facility = await response.json();
    }
    console.log(`facility uid: ${facility?.uid}`);
    return {
        facility: facility,
        entryMap: await facilityEntries(facility?.uid)
    };
    
}
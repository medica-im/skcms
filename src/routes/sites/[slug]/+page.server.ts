import type { EntryGenerator } from './$types';
import { variables } from '$lib/utils/constants';
import type { Facility } from '$lib/interfaces/facility.interface.ts';

export const entries: EntryGenerator = async () => {
    const url = `${variables.BASE_API_URI}/facilities/`;
    const response = await fetch(
        url,
        {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'content-type': 'application/json'
            }
        }
    );
    const facilities_json: any = await response.json();
    const facilities: Facility[] = facilities_json?.facilities;
    const slugArr: { slug: string }[] = []
    const slugs: string[] = facilities.map(e => e.slug);
    slugs.forEach((e) => {
        const slug = { slug: e };
        slugArr.push(slug);
    })
    console.log(slugArr);
    return slugArr
};

export const prerender = true;
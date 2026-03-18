import { ORIGIN } from '$lib/utils/origin.ts';
import type { EntryGenerator } from './$types';
import type { Facility } from '$lib/interfaces/facility.interface.ts';

export const entries: EntryGenerator = async () => {
    const url = `${ORIGIN}/api/v1/facilities/`;
    try {
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
        if (!response.ok) {
            console.error(`entries fetch ${url} failed: ${response.status}`);
            return [];
        }
        const facilities_json: any = await response.json();
        const facilities: Facility[] = facilities_json?.facilities;
        const slugArr: { slug: string }[] = []
        const slugs: string[] = facilities.map((e) => { return e.slug || e.uid });
        slugs.forEach((e) => {
            const slug = { slug: e };
            slugArr.push(slug);
        })
        return slugArr
    } catch (error) {
        console.error(`entries fetch ${url} error:`, error);
        return [];
    }
};

export const prerender = false;
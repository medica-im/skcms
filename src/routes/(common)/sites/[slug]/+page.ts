import { PUBLIC_ORIGIN as ORIGIN } from '$env/static/public';
import { facilityEntries } from '$lib/components/Directory/sites.ts';
import { error } from '@sveltejs/kit';
import type { Facility } from '$lib/interfaces/facility.interface.ts';
import type { PageLoad } from './$types';

function isHexUUID(h: string) {
    return h.match(/^[a-f0-9]{32}$/i) !== null;
}

export const load: PageLoad = async ({ params, fetch, parent }) => {
    const { entries } = await parent();
    if (entries===undefined) throw new Error("entries undefined")
    const { labels } = await parent();
    if ( labels === undefined ) throw new Error("labels undefined")
    let facility: Facility;
    const slug = params.slug;
    if (!slug) {
        error(404, 'Slug manquant.');
    }
    const endpoint = isHexUUID(slug) ? 'facilitiesuid' : 'facilities';
    const url = `${ORIGIN}/api/v1/${endpoint}/${slug}/`;
    const response = await fetch(url,
        {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'content-type': 'application/json'
            }
        });
    if (!response.ok) {
        console.error(`sites/[slug] PageLoad fetch ${url} response status: ${response.status}`);
        error(response.status, {
                    message: 'Une erreur est survenue.',
                    code: response.status,
                    type: 'site'
                });
    }
    facility = await response.json() as Facility;
    return {
        facility: facility,
        entryMap: facilityEntries(entries, facility?.uid, labels)
    };
}
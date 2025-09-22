import type { PageLoad } from './$types';
import { getEntries } from '$lib/store/directoryStore.ts';
import { get } from '@square/svelte-store';
import { variables } from '$lib/utils/constants.ts';
import type { Entry } from '$lib/store/directoryStoreInterface.ts';

function findEntry(entries: Entry[], params) {
    return entries.find(e => e.commune.slug==params.commune && e.effector_type.slug==params.type && e.slug==params.effector) as Entry
}

const fetchCareHome = async (fetch, uid) => {
    const apiUrl = `${variables.BASE_API_URI}/carehomes/${uid}`;
    try {
        const response = await fetch(apiUrl);
        if (response?.ok) {
            const data = await response.json();
            return data;
        } else {
            const error = `HTTP Response Code: ${response?.status}`;
            console.error(error)
            throw new Error(error);
        }
    } catch (error) {
        return null;
    }
}

export const load: PageLoad = async ({ fetch, params }) => {
    console.log(JSON.stringify(params))
    const entries = await getEntries();
    //console.log(`effectors:${JSON.stringify(effectors)}`);

    let entry = findEntry(entries, params)
    let component;
    const careHomeSlugArray = ['ehpad', 'usld'];
    if (careHomeSlugArray.includes(entry.effector_type.slug)) {
        let careHomeData = await fetchCareHome(fetch, entry.effector_uid);
        effector.careHome=careHomeData;
        if (params.type == "ehpad") {
            component="careHome"
        } else if (params.type == "usld") {
            component="usld"
        }
    } else {
        component="default"
    }
    return {
        //type: params.type,
        //commune: params.commune,
        //effector: params.effector,
        entry: entry,
        component: component
    }
}
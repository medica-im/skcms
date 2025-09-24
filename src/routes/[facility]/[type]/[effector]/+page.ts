import type { PageLoad } from './$types';
import { variables } from '$lib/utils/constants.ts';
import { handleRequestsWithPermissions } from '$lib/utils/requestUtils';
import { dev } from '$app/environment';
//import { getEntry } from '$lib/components/Entry/entry';
import type { FetchFunction } from 'vite';
import type { HandleFetch } from '@sveltejs/kit';

const getEntryData = async (url: string, fetch)=> {
    const response = await fetch(
        url,
        {
            mode: 'cors',
            headers: {
				'Content-Type': 'application/json',
			}
        }
    );
    const data = await response.json();
    return data
}

export const load: PageLoad = async ({ fetch, params, depends }) => {
    const apiUrl = `${variables.BASE_API_URI}/fulleffector/${params.facility}/${params.type}/${params.effector}/`;
    //let [res, error]= await handleRequestsWithPermissions(fetch,apiUrl);
    //if (dev) {
    //    console.log(res);
    //    console.log(error);
    //}
    const canonicalUrl = `${variables.BASE_URI}/${params.facility}/${params.type}/${params.effector}`;
    depends('entry:now')
    
    return {
        entry: await getEntryData(apiUrl,fetch),
        canonicalUrl: canonicalUrl
    }
}


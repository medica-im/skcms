import type { PageLoad } from './$types';
import { variables } from '$lib/utils/constants.ts';
import DefaultComponent from '$lib/components/Directory/EffectorContact.svelte';
import CareHomePage from '$lib/Directory/CareHomePage.svelte';
import UsldPage from '$lib/Directory/UsldPage.svelte';
import { getMemberships } from '$lib/components/Directory/directory.ts';
import { error } from '@sveltejs/kit';
import { browser } from '$app/environment';
import { fetchCareHome } from '$lib/utils/fetchCareHome.ts';
import type { EntryFull, Entry } from '$lib/store/directoryStoreInterface';

export const load: PageLoad = async ({ fetch, params, depends, parent, data, url }) => {
    depends('entry:now');
    const { entries } = await parent();
    if (entries === undefined) throw new Error("entries undefined")
    let componentData;
    let component;
    let fullentry: EntryFull | undefined;
    let memberships: Entry[] | null;
    if (browser && import.meta.env.PROD) {
        const url = `${variables.BASE_URI}/api/v2/fullentries/slug/${params.slug}`;
        const res = await fetch(url, {
        credentials: 'include',
        method: 'GET',
        headers: { "content-type": "application/json" },
      });
        if (!res.ok) {
            console.error("fetch error in PageLoad", res.status);
            error(res.status, {
                message: 'Une erreur est survenue.',
                code: res.status
            });
        }
        fullentry = await res.json() as EntryFull;
        memberships = fullentry.memberships ? getMemberships(entries, fullentry.memberships) : null;
    } else {
        fullentry = data.fullentry;
        memberships = data.memberships
    }
    const careHomeSlugArray = ['ehpad', 'usld'];
    if (careHomeSlugArray.includes(fullentry.effector_type.slug)) {
        const careHomeData = await fetchCareHome(fetch, fullentry.effector_uid);
        componentData = {
            fullentry: fullentry,
            careHomeData: careHomeData,
            memberships: memberships
        };
        if (fullentry.effector_type.slug == "ehpad") {
            component = CareHomePage
        } else if (fullentry.effector_type.slug == "usld") {
            component = UsldPage
        }
    } else {
        component = DefaultComponent
        componentData = {
            fullentry: fullentry,
            memberships: memberships
        };
    }
    const canonicalUrl = `${variables.BASE_URI}/e/${params.slug}`;
    return {
        componentData: componentData,
        component: component,
        canonicalUrl: canonicalUrl,
    }
}

import { ORIGIN } from '$lib/utils/origin.ts';
import { browser } from '$app/environment';
import type { PageLoad } from './$types';
import type { EffectorType } from '$lib/interfaces/v2/effector';

export const load: PageLoad = async ({ fetch, data }) => {
    let effectorTypes: EffectorType[] | undefined;
    if (browser && import.meta.env.PROD) {
        try {
            const url = `${ORIGIN}/api/v2/effector-types`;
            const response = await fetch(url, {
                credentials: 'include',
                method: 'GET',
                headers: { "content-type": "application/json" },
            });
            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }
            effectorTypes = await response.json() as EffectorType[];
        } catch (error: any) {
            console.error('Error retrieving effector types from +page.ts', error.message);
        }
    }
    return {
        session: data.session,
        effectorTypes: effectorTypes || data.effectorTypes,
    }
}

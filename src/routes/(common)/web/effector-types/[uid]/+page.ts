import { ORIGIN } from '$lib/utils/origin.ts';
import { browser } from '$app/environment';
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import type { EffectorType } from '$lib/interfaces/v2/effector';

export const load: PageLoad = async ({ fetch, data, params }) => {
    let effectorType: EffectorType | undefined;
    let effectorTypes: EffectorType[] | undefined;
    if (browser && import.meta.env.PROD) {
        const url = `${ORIGIN}/api/v2/effector-types/${params.uid}`;
        const response = await fetch(url, {
            credentials: 'include',
            method: 'GET',
            headers: { "content-type": "application/json" },
        });
        if (!response.ok) {
            error(response.status, {
                message: 'Une erreur est survenue.',
                code: response.status,
            });
        }
        effectorType = await response.json() as EffectorType;

        try {
            const listUrl = `${ORIGIN}/api/v2/effector-types`;
            const listResponse = await fetch(listUrl, {
                credentials: 'include',
                method: 'GET',
                headers: { "content-type": "application/json" },
            });
            if (listResponse.ok) {
                effectorTypes = await listResponse.json() as EffectorType[];
            }
        } catch (e: any) {
            console.error('Error retrieving effector types from +page.ts', e.message);
        }
    }
    return {
        effectorType: effectorType || data.effectorType,
        effectorTypes: effectorTypes || data.effectorTypes,
    }
}

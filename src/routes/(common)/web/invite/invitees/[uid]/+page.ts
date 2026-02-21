import { PUBLIC_ORIGIN as ORIGIN } from '$env/static/public';
import { browser } from '$app/environment';
import type { PageLoad } from './$types';
import type { Invitee } from '$src/lib/interfaces/v2/invitee';

export const load: PageLoad = async ({ data, params }) => {
    let invitee: Invitee | undefined;
    if (browser && import.meta.env.PROD) {
        try {
            const endpointUrl = `${ORIGIN}/api/v2/invitees/${params.uid}`;
            const response = await fetch(endpointUrl, {
                credentials: 'include',
                method: 'GET',
                headers: { "content-type": "application/json" },
            });
            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }
            invitee = await response.json() as Invitee;
            console.log(`invitee fetched +page.ts`, invitee);
        } catch (error: any) {
            console.error('There was an error while retrieving invitee from +page.ts', error.message);
        }
    }
    return {
        invitee: invitee || data.invitee
    }
}

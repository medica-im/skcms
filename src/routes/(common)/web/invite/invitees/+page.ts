import { PUBLIC_ORIGIN as ORIGIN } from '$env/static/public';
import { browser } from '$app/environment';
import type { PageLoad } from './$types';
import type { Invitee } from '$src/lib/interfaces/v2/invitee';

export const load: PageLoad = async ({ data, url }) => {
    let invitees: Invitee[] | undefined;
    if (browser && import.meta.env.PROD) {
        try {
            const endpointUrl = `${ORIGIN}/api/v2/invitees`;
            const response = await fetch(endpointUrl, {
                credentials: 'include',
                method: 'GET',
                headers: { "content-type": "application/json" },
            });
            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }
            invitees = await response.json() as Invitee[];
            console.log(`invitee(s) fetched +page.ts`, invitees);
        } catch (error: any) {
            console.error('There was an error while retrieving invitees from +page.ts', error.message);
        }
    }
    return {
        invitees: invitees || data.invitees
    }
}

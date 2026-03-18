import { ORIGIN } from '$lib/utils/origin.ts';
import type { PageLoad } from './$types';
import type { Invitee } from '$src/lib/interfaces/v2/invitee';
import type { User } from '$src/lib/interfaces/v2/user';

export const load: PageLoad = async ({ data, params, fetch }) => {
    let invitee: Invitee | undefined;
    let createdByUser: User | undefined;
    if (import.meta.env.PROD) {
        try {
            const endpointUrl = `${ORIGIN}/api/v2/invitees/${params.uid}`;
            console.log(endpointUrl);
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
            if (invitee?.createdBy) {
                try {
                    const userUrl = `${ORIGIN}/api/v2/users/${invitee.createdBy}`;
                    const userResponse = await fetch(userUrl, {
                        credentials: 'include',
                        method: 'GET',
                        headers: { "content-type": "application/json" },
                    });
                    if (userResponse.ok) {
                        createdByUser = await userResponse.json() as User;
                    }
                } catch (e: any) {
                    console.error('Failed to fetch createdBy user:', e.message);
                }
            }
        } catch (error: any) {
            console.error('There was an error while retrieving invitee from +page.ts', error.message);
        }
    }
    return {
        invitee: invitee || data.invitee,
        createdByUser: createdByUser || data.createdByUser
    }
}

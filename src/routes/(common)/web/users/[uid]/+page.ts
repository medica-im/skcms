import { ORIGIN } from '$lib/utils/origin.ts';
import type { PageLoad } from './$types';
import type { User, AccessHistory } from '$src/lib/interfaces/v2/user';

export const load: PageLoad = async ({ params, fetch }) => {
    let userDetail: User | undefined;
        try {
            const endpointUrl = `${ORIGIN}/api/v2/users/${params.uid}`;
            const response = await fetch(endpointUrl, {
                credentials: 'include',
                method: 'GET',
                headers: { "content-type": "application/json" },
            });
            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }
            userDetail = await response.json() as User;
            console.log(`userDetail fetched +page.ts`, userDetail);
        } catch (error: any) {
            console.error('There was an error while retrieving user from +page.ts', error.message);
        }

    let accessHistory: AccessHistory[] | undefined;
    try {
        const endpointUrl = `${ORIGIN}/api/v2/users/${params.uid}/access-history`;
        const response = await fetch(endpointUrl, {
            credentials: 'include',
            method: 'GET',
            headers: { "content-type": "application/json" },
        });
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }
        accessHistory = await response.json() as AccessHistory[];
    } catch (error: any) {
        console.error('There was an error while retrieving access history from +page.ts', error.message);
    }

    return {
        userDetail: userDetail,
        accessHistory
    }
}

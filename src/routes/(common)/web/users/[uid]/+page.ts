import { PUBLIC_ORIGIN as ORIGIN } from '$env/static/public';
import type { PageLoad } from './$types';
import type { User } from '$src/lib/interfaces/v2/user';

export const load: PageLoad = async ({ data, params, fetch }) => {
    let userDetail: User | undefined;
    if (import.meta.env.PROD) {
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
    }
    return {
        userDetail: userDetail || data.userDetail
    }
}

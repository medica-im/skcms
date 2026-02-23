import { PUBLIC_ORIGIN as ORIGIN } from '$env/static/public';
import { browser } from '$app/environment';
import type { PageLoad } from './$types';
import type { User } from '$src/lib/interfaces/v2/user';

export const load: PageLoad = async ({ fetch, data }) => {
    let users: User[] | undefined;
    if (import.meta.env.PROD) {
        try {
            const endpointUrl = `${ORIGIN}/api/v2/users`;
            const response = await fetch(endpointUrl, {
                credentials: 'include',
                method: 'GET',
                headers: { "content-type": "application/json" },
            });
            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }
            users = await response.json() as User[];
            console.log(`user(s) fetched +page.ts`, users);
        } catch (error: any) {
            console.error('There was an error while retrieving users from +page.ts', error.message);
        }
    }
    return {
        users: users || data.users
    }
}

import { PUBLIC_ORIGIN as ORIGIN } from '$env/static/public';
import type { Fetch } from '$lib/interfaces/fetch.ts';

export const fetchCareHome = async (fetch: Fetch, uid: string) => {
    const apiUrl = `${ORIGIN}/api/v1/carehomes/${uid}`;
    try {
        const response = await fetch(apiUrl);
        if (response?.ok) {
            const data = await response.json();
            return data;
        } else {
            const error = `HTTP Response Code: ${response?.status}`;
            console.error(error)
            throw new Error(error);
        }
    } catch (error) {
        return null;
    }
}

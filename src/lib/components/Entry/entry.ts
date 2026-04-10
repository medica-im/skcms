import { variables } from '$lib/utils/constants';
import type { EntryFull } from '$lib/store/directoryStoreInterface';

type Fetch = {
    (input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
    (input: string | URL | globalThis.Request, init?: RequestInit): Promise<Response>;
}

export async function getEntry(entrySlug: string, fetch: Fetch) {
    try {
        const response = await fetch(`${variables.BASE_URI}/api/v2/fullentries/slug/${entrySlug}`)
        if (response.status !== 200 && !response.ok) {
            throw new Error(`${response.status}: Unable to fetch resource`)
        }
        const json = await response.json()
        return json as EntryFull
    } catch (error) {
        if (error instanceof Error) {
            console.error('[request failed]', error.message)
        } else {
            throw error;
        }
    }
}

export function getEntryPromises(entrySlugs: string[], fetch: Fetch) {
    const entryPromises = [];
    for (const entrySlug of entrySlugs) {
        entryPromises.push(getEntry(entrySlug, fetch));
    }
    return entryPromises;
};

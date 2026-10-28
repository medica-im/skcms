import { variables } from '$lib/utils/constants';
import type { Entry, EntryCredit, EntryFull } from '$lib/store/directoryStoreInterface';

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
            console.error(`[request failed] ${entrySlug}:`, error.message)
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

/** A page's team, credited in the order of `entrySlugs`, retired members included. */
export async function getTeam(entrySlugs: string[], fetch: Fetch): Promise<EntryCredit[]> {
    const query = new URLSearchParams(entrySlugs.map((slug) => ['slug', slug]));
    try {
        const response = await fetch(`${variables.BASE_URI}/api/v2/entry-credits?${query}`);
        if (!response.ok) throw new Error(`${response.status}: Unable to fetch resource`);
        return (await response.json()) as EntryCredit[];
    } catch (error) {
        console.error('[request failed] entry-credits:', error instanceof Error ? error.message : error);
        return [];
    }
}

/** The entrySlugs of the active entries whose effector type is named `typeName` (its French name). */
export function entrySlugsOfType(entries: Entry[] | undefined, typeName: string): string[] {
    return (entries ?? [])
        .filter((e) => e.active && e.effector_type?.name === typeName)
        .map((e) => e.entrySlug);
}

/** The full entries of one effector type, from the site's entries (the layout's `entries`). */
export async function getEntriesOfType(entries: Entry[] | undefined, typeName: string, fetch: Fetch) {
    const results = await Promise.all(getEntryPromises(entrySlugsOfType(entries, typeName), fetch));
    return results.filter((e): e is EntryFull => e !== undefined);
}

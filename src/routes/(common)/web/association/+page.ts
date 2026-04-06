import { ORIGIN } from '$lib/utils/origin.ts';
import { browser } from '$app/environment';
import type { PageLoad } from './$types';
import type { BoardMember, Officer, OrganizationRole } from '$lib/interfaces/v2/association';
import type { Effector } from '$lib/interfaces/v2/effector';

async function fetchJson<T>(fetch: typeof globalThis.fetch, url: string): Promise<T | undefined> {
    try {
        const response = await fetch(url, {
            credentials: 'include',
            method: 'GET',
            headers: { 'content-type': 'application/json' },
        });
        if (!response.ok) throw new Error(`Response status: ${response.status}`);
        return await response.json() as T;
    } catch (error: any) {
        console.error(`Error fetching ${url}:`, error.message);
        return undefined;
    }
}

export const load: PageLoad = async ({ fetch, data, parent }) => {
    let boardMembers: BoardMember[] | undefined;
    let officers: Officer[] | undefined;
    let organizationRoles: OrganizationRole[] | undefined;
    let effectors: Effector[] | undefined;

    if (browser && import.meta.env.PROD) {
        const { organization, user } = await parent();
        const entryUid = organization?.uid;

        boardMembers = await fetchJson<BoardMember[]>(fetch, `${ORIGIN}/api/v2/board-members?entry_uid=${entryUid}`);
        officers = await fetchJson<Officer[]>(fetch, `${ORIGIN}/api/v2/officers?entry_uid=${entryUid}`);
        organizationRoles = await fetchJson<OrganizationRole[]>(fetch, `${ORIGIN}/api/v2/organization-roles`);

        if (user?.role === 'superuser') {
            effectors = await fetchJson<Effector[]>(fetch, `${ORIGIN}/api/v2/superuser-effectors`);
        } else if (user?.role === 'administrator') {
            effectors = await fetchJson<Effector[]>(fetch, `${ORIGIN}/api/v2/administrator-effectors`);
        }
    }

    return {
        boardMembers: boardMembers || data.boardMembers,
        officers: officers || data.officers,
        organizationRoles: organizationRoles || data.organizationRoles,
        effectors: effectors || data.effectors,
    };
}

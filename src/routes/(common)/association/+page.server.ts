import { ORIGIN } from '$lib/utils/origin.ts';
import type { BoardMember, Officer, OrganizationRole } from '$lib/interfaces/v2/association';
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ fetch, parent }) => {
    const { organization } = await parent();
    const entryUid = organization?.uid;

    let boardMembers: BoardMember[] = [];
    let officers: Officer[] = [];
    let organizationRoles: OrganizationRole[] = [];

    try {
        const res = await fetch(`${ORIGIN}/api/v2/officers?entry_uid=${entryUid}`);
        if (res.ok) officers = await res.json();
    } catch (error: any) {
        console.error('Error fetching officers:', error.message);
    }

    try {
        const res = await fetch(`${ORIGIN}/api/v2/board-members?entry_uid=${entryUid}`);
        if (res.ok) boardMembers = await res.json();
    } catch (error: any) {
        console.error('Error fetching board members:', error.message);
    }

    try {
        const res = await fetch(`${ORIGIN}/api/v2/organization-roles`);
        if (res.ok) organizationRoles = await res.json();
    } catch (error: any) {
        console.error('Error fetching organization roles:', error.message);
    }

    return {
        officers,
        boardMembers,
        organizationRoles,
    };
}

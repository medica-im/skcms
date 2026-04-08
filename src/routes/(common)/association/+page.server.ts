import { ORIGIN } from '$lib/utils/origin.ts';
import type { BoardMember, MembershipCategory, Officer, OrganizationRole } from '$lib/interfaces/v2/association';
import type { Labels } from '$lib/interfaces/label.interace.ts';
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ fetch, parent }) => {
    const { organization } = await parent();
    const entryUid = organization?.uid;

    let boardMembers: BoardMember[] = [];
    let officers: Officer[] = [];
    let organizationRoles: OrganizationRole[] = [];
    let membershipCategories: MembershipCategory[] = [];
    let organizationRoleLabels: Labels = {};

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

    try {
        const res = await fetch(`${ORIGIN}/api/v2/membership-categories?entry_uid=${entryUid}`);
        if (res.ok) membershipCategories = await res.json();
    } catch (error: any) {
        console.error('Error fetching membership categories:', error.message);
    }

    try {
        const res = await fetch(`${ORIGIN}/api/v2/organization-role-labels`);
        if (res.ok) organizationRoleLabels = await res.json();
    } catch (error: any) {
        console.error('Error fetching organization role labels:', error.message);
    }

    return {
        officers,
        boardMembers,
        organizationRoles,
        membershipCategories,
        organizationRoleLabels,
    };
}

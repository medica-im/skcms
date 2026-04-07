import { redirect } from '@sveltejs/kit';
import { authReq } from '$lib/utils/request.ts';
import { variables } from '$lib/utils/constants.ts';
import { ORIGIN } from '$lib/utils/origin.ts';
import type { BoardMember, MembershipCategory, Officer, OrganizationRole } from '$lib/interfaces/v2/association';
import type { Effector } from '$lib/interfaces/v2/effector';
import type { User } from '$lib/interfaces/user.interface';
import type { PageServerLoad } from "./$types"

function getEffectorsUrl(user: User) {
    if (user?.role === 'superuser') {
        return `${ORIGIN}/api/v2/superuser-effectors`;
    } else if (user?.role === 'administrator') {
        return `${ORIGIN}/api/v2/administrator-effectors`;
    }
    throw new Error("role is not authorized");
}

export const load: PageServerLoad = async ({ url, cookies, locals, parent, depends }) => {
    depends('association:data');
    const session = await locals.auth();
    if (!session) {
        redirect(303, `/signin?redirect=${url.pathname}`);
    }

    const { user, organization } = await parent();

    let boardMembers: BoardMember[] | undefined;
    let officers: Officer[] | undefined;
    let organizationRoles: OrganizationRole[] | undefined;
    let membershipCategories: MembershipCategory[] | undefined;
    let effectors: Effector[] | undefined;

    if (import.meta.env.DEV) {
        const entryUid = organization?.uid;

        try {
            const bmUrl = `${variables.BASE_URI}/api/v2/board-members?entry_uid=${entryUid}`;
            const bmReq = authReq(bmUrl, 'GET', cookies);
            const bmRes = await globalThis.fetch(bmReq);
            if (bmRes.ok) boardMembers = await bmRes.json();
            else console.error(`Failed to fetch board members: ${bmRes.status}`);
        } catch (error: any) {
            console.error('Error retrieving board members:', error.message);
        }

        try {
            const offUrl = `${variables.BASE_URI}/api/v2/officers?entry_uid=${entryUid}`;
            const offReq = authReq(offUrl, 'GET', cookies);
            const offRes = await globalThis.fetch(offReq);
            if (offRes.ok) officers = await offRes.json();
            else console.error(`Failed to fetch officers: ${offRes.status}`);
        } catch (error: any) {
            console.error('Error retrieving officers:', error.message);
        }

        try {
            const rolesUrl = `${variables.BASE_URI}/api/v2/organization-roles`;
            const rolesReq = authReq(rolesUrl, 'GET', cookies);
            const rolesRes = await globalThis.fetch(rolesReq);
            if (rolesRes.ok) organizationRoles = await rolesRes.json();
            else console.error(`Failed to fetch organization roles: ${rolesRes.status}`);
        } catch (error: any) {
            console.error('Error retrieving organization roles:', error.message);
        }

        try {
            const mcUrl = `${variables.BASE_URI}/api/v2/membership-categories?entry_uid=${entryUid}`;
            const mcReq = authReq(mcUrl, 'GET', cookies);
            const mcRes = await globalThis.fetch(mcReq);
            if (mcRes.ok) membershipCategories = await mcRes.json();
            else console.error(`Failed to fetch membership categories: ${mcRes.status}`);
        } catch (error: any) {
            console.error('Error retrieving membership categories:', error.message);
        }

        if (user?.role === 'superuser' || user?.role === 'administrator') {
            try {
                const effUrl = getEffectorsUrl(user);
                const effReq = authReq(effUrl, 'GET', cookies);
                const effRes = await globalThis.fetch(effReq);
                if (effRes.ok) effectors = await effRes.json();
                else console.error(`Failed to fetch effectors: ${effRes.status}`);
            } catch (error: any) {
                console.error('Error retrieving effectors:', error.message);
            }
        }
    }

    return {
        session,
        boardMembers,
        officers,
        organizationRoles,
        membershipCategories,
        effectors,
    };
}

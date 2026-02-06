import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
    const { user, organization } = await parent();
    if (organization === undefined) throw new Error("organization undefined");

    return {
        user,
        organization
    };
}

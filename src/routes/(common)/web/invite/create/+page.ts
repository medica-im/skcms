import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, data }) => {
    const { organization } = await parent();
    if (organization === undefined) throw new Error("organization undefined");

    return {
        session: data.session,
        organization: organization
    };
}

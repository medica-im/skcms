import { cardCatEntries } from '$lib/components/Directory/directory.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({parent}) => {
    const { organization } = await parent();
    const currentOrg: boolean = true;
    const orgUid = organization.uid;
    return {
        cardinal: await cardCatEntries(currentOrg, orgUid)
    };
}
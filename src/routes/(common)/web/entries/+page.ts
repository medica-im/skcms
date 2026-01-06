import { cardCatEntries } from '$lib/components/Directory/directory.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({parent}) => {
    const { organization } = await parent();
    const { entries } = await parent();
    const orgUid = organization?.uid;
    console.log("orgUid", orgUid);
    return {
        cardinal: await cardCatEntries(entries)
    };
}
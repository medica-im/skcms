import { cardCatEntries } from '$lib/components/Directory/directory.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({parent}) => {
    const { organization } = await parent();
    const { entries } = await parent();
    if (entries === undefined) throw new Error("entries undefined")
    const { labels } = await parent();
    if ( labels === undefined ) throw new Error("labels undefined")
    const orgUid = organization?.uid;
    return {
        cardinal: cardCatEntries(entries, labels)
    };
}
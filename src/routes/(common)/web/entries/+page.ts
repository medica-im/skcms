import { cardCatEntries } from '$lib/components/Directory/directory.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({parent, depends}) => {
    depends('entry:now');
    const { entries } = await parent();
    if (entries === undefined) throw new Error("entries undefined")
    const { labels } = await parent();
    if ( labels === undefined ) throw new Error("labels undefined")
    return {
        cardinal: cardCatEntries(entries, labels)
    };
}
import type { PageLoad } from './$types';

export const load: PageLoad = async ({parent, depends}) => {
    depends('entry:now');
    const { entries } = await parent();
    if (entries === undefined) throw new Error("entries undefined")
    return {
        entries
    };
}
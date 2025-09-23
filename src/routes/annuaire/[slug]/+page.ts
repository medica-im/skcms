import type { PageLoad } from './$types';
import { categories, directoryRedirect } from '$lib/store/directoryStore.ts';
import { cardCatEntries } from '$lib/components/Directory/directory.ts';
import type { Organization } from '$lib/interfaces/organization.ts';

const uidOfSlug = (slug: string, effectorTypes: any[]) => {
    const effectorType = effectorTypes.find((element) => element.slug == slug);
    return effectorType.uid;
};

export const load: PageLoad = async ({params, parent}) => {
    const { organization }:{ organization: Organization } = await parent();
    directoryRedirect.set(true);
    const currentOrg = true;
    const orgUid = organization.uid;
    const slug = params.slug;
    const effectorTypes = await categories();
    const uid: string = uidOfSlug(slug, effectorTypes);
    const types = [uid];
    return {
        cardinal: await cardCatEntries(currentOrg, orgUid, types),
        slug: slug,
        types: types
    };
}
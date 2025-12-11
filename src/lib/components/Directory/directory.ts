import { categorizedFilteredEffectorsF, cardinalCategorizedFilteredEffectorsF, getEntries } from '$lib/store/directoryStore.ts';
import { filterInPlace } from '$lib/utils/utils';
import type { Entry } from '$lib/store/directoryStoreInterface';
import type { Fetch } from '$lib/interfaces/fetch.ts';

export const cardCatEntries = async (currentOrg: boolean | null=null, orgUid: string|null=null, types: string[]|null = null) => {
    const entries = await getEntries();
    filterInPlace(entries, (e: Entry) => {
        if (currentOrg == true && orgUid) {
            return e.memberships?.includes(orgUid) || e.employers?.includes(orgUid)
        } else if (currentOrg == false && orgUid) {
            return !e.memberships?.includes(orgUid) && !e.employers?.includes(orgUid)
        } else {
            return true
        }
    });
    if (types) {
        filterInPlace(entries, (e: Entry) => {
            return types.includes(e.effector_type.uid)
        });
    }
    const categorizedEntries = categorizedFilteredEffectorsF(entries);
    const cardinalCategorizedEntries = await cardinalCategorizedFilteredEffectorsF(categorizedEntries);
    return cardinalCategorizedEntries;
};

export const getMemberships = async (uids: string[]) => {
    const entries = await getEntries();
    filterInPlace(entries, (e: Entry) => { return uids.includes(e.uid) });
    return entries;
};
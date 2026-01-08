import { categorizedFilteredEffectorsF, cardinalCategorizedFilteredEffectorsF } from '$lib/store/directoryStore.ts';
import { filterInPlace } from '$lib/utils/utils';
import { shuffle } from '$lib/helpers/random';
import type { Entry } from '$lib/store/directoryStoreInterface';
import type { Fetch } from '$lib/interfaces/fetch.ts';
import type { Labels } from '$lib/interfaces/label.interace.ts';

export const cardCatEntries = (entries: Entry[], labels: Labels, currentOrg: boolean | null=null, orgUid: string|null=null, types: string[]|null = null) => {
    if (!entries) return null
    const filteredEntries = entries.filter((e: Entry) => {
        if (currentOrg == true && orgUid) {
            return e.memberships?.includes(orgUid) || e.employers?.includes(orgUid)
        } else if (currentOrg == false && orgUid) {
            return !e.memberships?.includes(orgUid) && !e.employers?.includes(orgUid)
        } else {
            return true
        }
    });
    if (types) {
        filterInPlace(filteredEntries, (e: Entry) => {
            return types.includes(e.effector_type.uid)
        });
    }
    const categorizedEntries = categorizedFilteredEffectorsF(filteredEntries);
    const cardinalCategorizedEntries = cardinalCategorizedFilteredEffectorsF(categorizedEntries, labels);
    return cardinalCategorizedEntries;
};

export const getAvatars = (entries: Entry[], uid: string) => {
    let carousel = entries.filter((e: Entry)=>{
        return ((e.avatar?.lt || e.avatar?.raw || e.avatar?.fb) && (e.memberships.includes(uid) || e.employers.includes(uid)))
    });
    shuffle(carousel);
    return carousel
};

export const getMemberships = (entries: Entry[], uids: string[]) => {
    return entries.filter((e: Entry) => { return uids.includes(e.uid) });
};

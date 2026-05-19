import { categorizedFilteredEffectorsF, cardinalCategorizedFilteredEffectorsF } from '$lib/store/directoryStore.ts';
import type { Entry } from '$lib/store/directoryStoreInterface';
import type { Facility } from '$lib/interfaces/facility.interface.ts';
import type { Labels } from '$lib/interfaces/label.interace.ts';

export const facilityEntries = (entries: Entry[], facilityUid: string | undefined, eTL: Labels) => {
    const filteredEntries = entries.filter(e => facilityUid == e.facility.uid && e.active);
    const categorizedEntries = categorizedFilteredEffectorsF(filteredEntries);
    const cardinalCategorizedEntries = cardinalCategorizedFilteredEffectorsF(categorizedEntries, eTL);
    return cardinalCategorizedEntries;
}

export const allFacilityEntries = (facilities: Facility[], entries: Entry[], orgUid: string, eTL: Labels, currentOrg: boolean | null = null): Map<string,Entry[]> => {
    const facilityEntriesMap = new Map();
    for (const facility of facilities) {
        if (
            (currentOrg == null) ||
            (currentOrg == true && facility.organizations.includes(orgUid)) || (currentOrg == false && !facility.organizations.includes(orgUid))
        ) {
            const fEntries = facilityEntries(entries, facility.uid, eTL);
            facilityEntriesMap.set(facility.uid, fEntries);
        }
    };
    return facilityEntriesMap;
}

export function allFacilities(facilities: Facility[], entries: Entry[], orgUid: string, currentOrg: boolean | null = null, active: boolean | null = true): Facility[] {
    const filteredEntries = active === null
        ? entries
        : entries.filter(e => e.active === active);
    if ( currentOrg==null ) {
        const entryUids = filteredEntries.map(e => e.uid);
        return facilities.filter(f => f.entries.some(e => entryUids.includes(e)));
    }
    const members = filteredEntries.filter(e=>e.memberships.includes(orgUid)).map(e=>e.uid);
    const filteredFacilities = facilities.filter(f => {
            return (currentOrg == true && members.some(e=>f.entries.includes(e))) || (currentOrg == false && !members.some(e=>f.entries.includes(e)))
    }
    );
    return filteredFacilities
};

export const allFacilitiesCount = async (facilities: Facility[], entries: Entry[], orgUid: string, currentOrg: boolean | null = null) => {
    const _allFacilities = allFacilities(facilities, entries, orgUid, currentOrg);
    return _allFacilities.length
};
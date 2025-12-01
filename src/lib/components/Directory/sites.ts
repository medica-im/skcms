import { getFacilities } from '$lib/store/facilityStore';
import { categorizedFilteredEffectorsF, cardinalCategorizedFilteredEffectorsF, getEntries } from '$lib/store/directoryStore.ts';

import type { Entry } from '$lib/store/directoryStoreInterface';
import type { Facility } from '$lib/interfaces/facility.interface.ts';

export const facilityEntries = async (facilityUid: string | undefined, entries: Entry[]|null=null) => {
    if (!entries) {
        entries = await getEntries();
    }
    const filteredEntries = entries.filter(e => facilityUid == e.facility.uid);
    const categorizedEntries = categorizedFilteredEffectorsF(filteredEntries);
    const cardinalCategorizedEntries = await cardinalCategorizedFilteredEffectorsF(categorizedEntries);
    return cardinalCategorizedEntries;
}

export const allFacilityEntries = async (orgUid: string, currentOrg: boolean | null = null) => {
    const facilities = await getFacilities();
    const entries = await getEntries();
    const facilityEntriesMap = new Map();
    for (const facility of facilities) {
        if (
            (currentOrg == null) ||
            (currentOrg == true && facility.organizations.includes(orgUid)) || (currentOrg == false && !facility.organizations.includes(orgUid))
        ) {
            const fEntries = await facilityEntries(facility.uid, entries);
            facilityEntriesMap.set(facility.uid, fEntries);
        }
    };
    return facilityEntriesMap;
}

export async function allFacilities(orgUid: string, currentOrg: boolean | null = null): Promise<Facility[]> {
    const facilities = await getFacilities();
    if ( currentOrg==null ) {
        return facilities
    }
    const entries = await getEntries();
    const members = entries.filter(e=>e.memberships.includes(orgUid)).map(e=>e.uid);
    const filteredFacilities = facilities.filter(f => {
            return (currentOrg == true && members.some(e=>f.entries.includes(e))) || (currentOrg == false && !members.some(e=>f.entries.includes(e)))
    }
    );
    return filteredFacilities
};

export const allFacilitiesCount = async (orgUid: string, currentOrg: boolean | null = null) => {
    const _allFacilities = await allFacilities(orgUid, currentOrg);
    return _allFacilities.length
};
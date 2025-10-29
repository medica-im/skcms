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
    //console.log(`cardinalCategorizedEntries of facility ${facility_uid}:`);
    /*for (let [key, value] of cardinalCategorizedEntries) {
        console.log(key + ' = ' + JSON.stringify(value))
    };*/
    return cardinalCategorizedEntries;
}

export const allFacilityEntries = async (orgUid: string, currentOrg: boolean | null = null) => {
    const facilities = await getFacilities();
    const entries = await getEntries();
    const facilityEntriesMap = new Map();
    //console.log(facilities.slice(1))
    for (const facility of facilities) {
        /*console.log(`currentOrg: ${currentOrg}`);
        console.log(`organizations: ${facility.organizations}`);
        console.log(facility.organizations.includes(orgUid));
        console.log((currentOrg == null) ||
            (currentOrg == true && facility.organizations.includes(orgUid)) || (currentOrg == false && !facility.organizations.includes(orgUid)));*/
        if (
            (currentOrg == null) ||
            (currentOrg == true && facility.organizations.includes(orgUid)) || (currentOrg == false && !facility.organizations.includes(orgUid))
        ) {
            const fEntries = await facilityEntries(facility.uid, entries);
            //console.log(`entries of facility ${facility.uid}: ${displayMap(entries)}`);
            facilityEntriesMap.set(facility.uid, fEntries);
        }
    };
    return facilityEntriesMap;
}

export async function allFacilities(orgUid: string, currentOrg: boolean | null = null): Promise<Facility[]> {
    const facilities = await getFacilities();
    const filteredFacilities = facilities.filter(f => {
        return (currentOrg == null) ||
            (currentOrg == true && f.organizations.includes(orgUid)) || (currentOrg == false && !f.organizations.includes(orgUid))
    }
    );
    return filteredFacilities
};

export const allFacilitiesCount = async (orgUid: string, currentOrg: boolean | null = null) => {
    const _allFacilities = await allFacilities(orgUid, currentOrg);
    return _allFacilities.length
};
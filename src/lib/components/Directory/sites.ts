import { getFacilities } from '$lib/store/facilityStore';
import { categorizedFilteredEffectorsF, cardinalCategorizedFilteredEffectorsF, getEntries } from '$lib/store/directoryStore.ts';

import type { Entry } from '$lib/store/directoryStoreInterface';
import type { Facility } from '$lib/interfaces/facility.interface.ts';

const entries = await getEntries();

const facilities = await getFacilities();

export const facilityEntries = async (facilityUid: string | undefined) => {
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
            const entries = await facilityEntries(facility.uid);
            //console.log(`entries of facility ${facility.uid}: ${displayMap(entries)}`);
            facilityEntriesMap.set(facility.uid, entries);
        }
    };
    return facilityEntriesMap;
}

export const allFacilities = async (orgUid: string, currentOrg: boolean | null = null) => {
    const filteredFacilities = facilities.filter(f => {
        return (currentOrg == null) ||
            (currentOrg == true && f.organizations.includes(orgUid)) || (currentOrg == false && !f.organizations.includes(orgUid))
    }
    );
    return filteredFacilities
};

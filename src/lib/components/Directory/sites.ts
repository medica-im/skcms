import { getFacilities } from '$lib/store/facilityStore';
import { categorizedFilteredEffectorsF, cardinalCategorizedFilteredEffectorsF, getEntries, selectFacility } from '$lib/store/directoryStore.ts';
import { filterInPlace, displayMap } from '$lib/utils/utils';

import type { Entry } from '$lib/store/directoryStoreInterface';


export const facilityEntries = async (facility_uid: string|undefined) => {
    const entries = await getEntries();
    filterInPlace(entries, (e: Entry) => {
        if (!selectFacility) {
            return true
        } else {
            return facility_uid == e.facility.uid
        }
    });
    const categorizedEntries = categorizedFilteredEffectorsF(entries);
    const cardinalCategorizedEntries = await cardinalCategorizedFilteredEffectorsF(categorizedEntries);
    //console.log(`cardinalCategorizedEntries of facility ${facility_uid}:`);
    /*for (let [key, value] of cardinalCategorizedEntries) {
		console.log(key + ' = ' + JSON.stringify(value))
	};*/
    return cardinalCategorizedEntries;
}

export const allFacilityEntries = async (orgUid: string, currentOrg:boolean|null=null) =>  {
    const facilityEntriesMap = new Map();
    const facilities = await getFacilities.load();
    //console.log(facilities.slice(1))
    for (const facility of facilities ) {
        if (currentOrg == null || currentOrg && facility.organizations.includes(orgUid) || !currentOrg && !facility.organizations.includes(orgUid)) {
        const entries = await facilityEntries(facility.uid);
        //console.log(`entries of facility ${facility.uid}: ${displayMap(entries)}`);
        facilityEntriesMap.set(facility.uid, entries);
        }
    };
    return facilityEntriesMap;
}

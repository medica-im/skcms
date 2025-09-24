import { categorizedFilteredEffectorsF, cardinalCategorizedFilteredEffectorsF, getEntries } from '$lib/store/directoryStore.ts';
import { filterInPlace } from '$lib/utils/utils';
import type { Entry } from '$lib/store/directoryStoreInterface';

export const cardCatEntries = async (currentOrg: boolean|null, orgUid: string, types: string[]|null=null) => {
    const entries = await getEntries();
    filterInPlace(entries, (e: Entry) => {
            if (currentOrg == true) {
				return e.organizations?.includes(orgUid) || e.employers?.includes(orgUid)
			} else if (currentOrg == false) {
				return !e.organizations?.includes(orgUid) && !e.employers?.includes(orgUid)
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
    /*for (let [key, value] of cardinalCategorizedEntries) {
        console.log(key + ' = ' + JSON.stringify(value))
    };*/
    return cardinalCategorizedEntries;
}

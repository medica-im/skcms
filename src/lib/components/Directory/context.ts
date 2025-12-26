import { getContext, setContext } from 'svelte';
import { writable } from 'svelte/store';
import type { Loadable } from '@square/svelte-store';
import type { Writable } from 'svelte/store';

import type { LimitCategoriesStore, AddressFeature, CurrentOrgStore, CommunesValueStore, DistanceEffectors, Type } from '$lib/store/directoryStoreInterface';
import type { SelectType } from '$lib/interfaces/select';

export function setEffectorUid(uid:string) {
    setContext('effectorUid', uid)
}

export function getEffectorUid() {
    return getContext<string>('effectorUid')
}

export function setEntryUid(uid:string) {
    setContext('entryUid', uid)
}

export function getEntryUid() {
    return getContext<string>('entryUid')
}

export function setDisplayMap() {
    let displayMap = writable<boolean>(false);
    setContext('displayMap', displayMap)
}

export function getDisplayMap() {
    return getContext<Writable<boolean>>('displayMap')
}

export function setEditMode() {
    let editMode = writable<boolean>(false);
    setContext('editMode', editMode)
}

export function getEditMode() {
    return getContext<Writable<boolean>>('editMode')
}

export function setTerm() {
	let term = writable<string>("");
	setContext('term', term)
}

export function getTerm() {
	return getContext<Writable<string>>('term')
}

export function setSelectCategories() {
    let selectCategories: Writable<string[]> = writable([]);
    setContext('selectCategories', selectCategories)
}
export function getSelectCategories() {
    return getContext<Writable<string[]>>('selectCategories')
}

export function setLimitCategories() {
    let limitCategories: LimitCategoriesStore = writable([]);
    setContext('limitCategories', limitCategories);
}

export function getLimitCategories() {
    return getContext<Writable<string[]>>('limitCategories');
}

export function setSelectedDepartments() {
    let selectDepartments: Writable<string[]|null> = writable(null);
    setContext('selectedDepartments', selectDepartments)
}

export function getSelectedDepartments() {
    return getContext<Writable<string[]|null>>('selectedDepartments');
}

export function setSelectedCommunesUids() {
    let selectCommunes: Writable<string[]> = writable([]);
    setContext('selectedCommunesUids', selectCommunes)
}

export function getSelectedCommunesUids() {
    return getContext<Writable<string[]>>('selectedCommunesUids');
}

export function setSelectedCommunesChoices() {
    let selectedCommunesChoices = writable(null);
    setContext('selectedCommunesChoices', selectedCommunesChoices);
}

export function getSelectedCommunesChoices() {
    return getContext<Writable<{label: string, value: string}[]|null>>('selectedCommunesChoices');
}

export function setSelCatVal() {
    let selCatVal: Writable<string|null> = writable(null);
    setContext('selCatVal', selCatVal);
}

export function getSelCatVal() {
    return getContext<Writable<{label: string, value: string}|null>>('selCatVal');
}

export function setSelectSituation() {
    let selectSituation: Writable<SelectType|null|undefined> = writable();
    setContext('selectSituation', selectSituation);
}

export function getSelectSituation() {
    return getContext<Writable<SelectType|undefined|null>>('selectSituation');
}

export function setAddressFeature() {
    let addressFeature: Writable<AddressFeature|null> = writable(null);
    setContext('addressFeature', addressFeature);
}

export function getAddressFeature() {
    return getContext<Writable<AddressFeature|null>>('addressFeature');
}

export function setGeoInputAddress() {
    let geoInputAddress: Writable<string|null> = writable(null);
    setContext('geoInputAddress', geoInputAddress);
}

export function getGeoInputAddress() {
    return getContext<Writable<string|null>>('geoInputAddress');
}

export function setInputAddress() {
    let inputAddress: Writable<string> = writable("");
    setContext('inputAddress', inputAddress);
}

export function getInputAddress() {
    return getContext<Writable<string>>('inputAddress');
}

export function setSelectFacility(facility: string|null=null) {
    let selectFacility: Writable<string|null> = writable(facility);
    setContext('selectFacility', selectFacility);
}

export function getSelectFacility() {
    return getContext<Writable<string|null>>('selectFacility');
}

export function setFacilityChoice() {
    let facilityChoice: Writable<{label: string; value: string}|undefined> = writable();
    setContext('facilityChoice', facilityChoice);
}

export function getFacilityChoice() {
    return getContext<Writable<{label: string; value: string}|undefined>>('facilityChoice');
}

export function setCurrentOrg() {
    let currentOrg: CurrentOrgStore = writable(true);
    setContext('currentOrg', currentOrg);
}

export function getCurrentOrg(): CurrentOrgStore {
    return getContext('currentOrg');
}

export function setDirectoryRedirect() {
    let directoryRedirect: Writable<boolean> = writable(true);
    setContext('directoryRedirect', directoryRedirect);
}

export function getDirectoryRedirect(): Writable<boolean> {
    return getContext('directoryRedirect');
}

export function setDistanceEffectors(distanceEffectors: Loadable<DistanceEffectors|null>) {
    setContext('distanceEffectors', distanceEffectors)
}

export function getDistanceEffectors(): Loadable<DistanceEffectors|null> {
    return getContext('distanceEffectors')
}
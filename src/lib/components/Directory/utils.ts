import { getTerm, getSelectedCommunesUids, getSelectedCommunesChoices, getSelectCategories, getSelCatVal, getSelectSituation, getSelectSituationValue, getInputAddress, getSelectFacility, getDirectoryRedirect, getAddressFeature } from './context.ts';

	let term = getTerm();
	let selectCommunesValue = getSelectedCommunesChoices();
    let selectCategories = getSelectCategories();
	let selCatVal = getSelCatVal();
    let selectSituation = getSelectSituation();
	let selectSituationValue = getSelectSituationValue();
	let inputAddress = getInputAddress();
    let selectFacility = getSelectFacility();
    let selectCommunes = getSelectedCommunesUids();
    let addressFeature = getAddressFeature();
	let directoryRedirect = getDirectoryRedirect();


export function resetDirectory() {
    term.set("");
    selectCommunes.set([]);
    selectCommunesValue.set(null);
    selectCategories.set([]);
    selCatVal.set(null);
    selectSituation.set("");
    selectSituationValue.set(null);
    addressFeature.set(null);
    inputAddress.set("");
    selectFacility.set(null);
}
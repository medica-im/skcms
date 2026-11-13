<script lang="ts">
	import { base } from '$app/paths';
	import Fa from 'svelte-fa';
	import { faDeleteLeft, faEraser } from '@fortawesome/free-solid-svg-icons';
	import {
		getTerm,
		getSelectedCommunesUids,
		getSelectedCommunesChoices,
		getSelectedDepartment,
		getSelectCategories,
		getSelCatVal,
		getSelectSituation,
		getSelectedTags,
		getInputAddress,
		getSelectFacility,
		getFacilityChoice,
		getDirectoryRedirect,
		getAddressFeature,
		getGeoInputAddress,
		getFacetSelection,
		getSelectConcern
	} from './context.ts';
	import { NO_FACETS } from '$lib/store/facetFilters.ts';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	const dirPath = `${base}${page.data.directory.setting.path || "/"}`;

	let term = getTerm();
	let selectedCommunesChoices = getSelectedCommunesChoices();
	let selectedCommunesUids = getSelectedCommunesUids();
	let selectDepartment = getSelectedDepartment();
	let selCatVal = getSelCatVal();
	let selectSituation = getSelectSituation();
	let inputAddress = getInputAddress();
	let directoryRedirect = getDirectoryRedirect();
	let selectCategories = getSelectCategories();
	let selectFacility = getSelectFacility();
	let facilityChoice = getFacilityChoice();
	let addressFeature = getAddressFeature();
	let geoInputAddress = getGeoInputAddress();
	let selectTags = getSelectedTags();
	let facetSelection = getFacetSelection();
	let selectConcern = getSelectConcern();

	let isDisabled = $derived(!(
		JSON.stringify($facetSelection) !== JSON.stringify(NO_FACETS) ||
		$selectConcern ||
		$term ||
		$selectedCommunesUids.length ||
		$selectedCommunesChoices ||
		$selectDepartment ||
		$selCatVal ||
		$selectSituation ||
		$inputAddress ||
		$selectFacility ||
		$geoInputAddress ||
		$selectTags
	));

	function resetDirectory() {
		term.set('');
		selectedCommunesUids.set([]);
		selectedCommunesChoices.set(null);
		selectDepartment.set(null);
		selectCategories.set([]);
		selCatVal.set(null);
		selectSituation.set(undefined);
		addressFeature.set(null);
		inputAddress.set('');
		facilityChoice.set(undefined);
		selectFacility.set(null);
		geoInputAddress.set(null);
		addressFeature.set(null);
		selectTags.set(null);
		facetSelection.set(NO_FACETS);
		selectConcern.set(null);
	}

	function erase() {
		resetDirectory();
		let query = new URLSearchParams(page.url.searchParams.toString());
		page.url.searchParams.forEach((value, key) => {
			query.delete(key);
		});
		goto(`?${query.toString()}`);
		if (page.url.pathname != dirPath && $directoryRedirect) {
			goto(dirPath);
		}
	}
</script>

<button class="btn variant-filled-error p-2" type="reset" onclick={erase} disabled={isDisabled}
	>
	<span><Fa icon={faEraser} size="sm" /></span>
	<span>Tout effacer</span>
</button>

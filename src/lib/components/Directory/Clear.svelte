<script lang="ts">
	import Fa from 'svelte-fa';
	import { faDeleteLeft, faEraser } from '@fortawesome/free-solid-svg-icons';
	import {
		getTerm,
		getSelectCommunes,
		getSelectCommunesValue,
		getSelectCategories,
		getSelCatVal,
		getSelectSituation,
		getInputAddress,
		getSelectFacility,
		getDirectoryRedirect,
		getAddressFeature,
		getGeoInputAddress

	} from './context.ts';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let term = getTerm();
	let selectCommunesValue = getSelectCommunesValue();
	let selCatVal = getSelCatVal();
	let selectSituation = getSelectSituation();
	let inputAddress = getInputAddress();
	let directoryRedirect = getDirectoryRedirect();
	let selectCategories = getSelectCategories();
	let selectFacility = getSelectFacility();
	let selectCommunes = getSelectCommunes();
	let addressFeature = getAddressFeature();
	let geoInputAddress = getGeoInputAddress();

	let isDisabled = $derived(!(
		$term ||
		$selectCommunesValue ||
		$selCatVal ||
		$selectSituation ||
		$inputAddress ||
		$selectFacility ||
		$geoInputAddress
	));

	function resetDirectory() {
		term.set('');
		selectCommunes.set([]);
		selectCommunesValue.set(null);
		selectCategories.set([]);
		selCatVal.set(null);
		selectSituation.set(null);
		addressFeature.set(null);
		inputAddress.set('');
		selectFacility.set(null);
		geoInputAddress.set(null);
		addressFeature.set(null);
	}

	function erase() {
		resetDirectory();
		let query = new URLSearchParams(page.url.searchParams.toString());
		page.url.searchParams.forEach((value, key) => {
			query.delete(key);
		});
		goto(`?${query.toString()}`);
		if (page.url.pathname != '/annuaire' && $directoryRedirect) {
			goto('/annuaire');
		}
	}
</script>

<button class="btn variant-filled-error p-2" type="reset" onclick={erase} disabled={isDisabled}
	>
	<span><Fa icon={faEraser} size="sm" /></span>
	<span>Tout effacer</span>
</button>

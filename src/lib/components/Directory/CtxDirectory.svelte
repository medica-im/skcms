<script lang="ts">
	import { setContext } from 'svelte';
	import { asyncDerived } from '@square/svelte-store';
	import {
		setTerm,
		getTerm,
		setSelectCategories,
		getSelectCategories,
		setLimitCategories,
		getLimitCategories,
		setSelectedCommunesUids,
		getSelectedCommunesUids,
		setSelectedCommunesChoices,
		setSelectSituation,
		getSelectSituation,
		setSelectFacility,
		getSelectFacility,
		setFacilityChoice,
		setCurrentOrg,
		getCurrentOrg,
		setDirectoryRedirect,
		getDirectoryRedirect,
		setAddressFeature,
		getAddressFeature,
		setSelCatVal,
		setInputAddress,
		setGeoInputAddress,
		setDistanceEffectors
	} from './context';
	import { variables } from '$lib/utils/constants.ts';
	import { organizationStore } from '$lib/store/facilityStore.ts';
	import {
		distanceEffectorsF,
		fullFilteredEffectorsF,
		filteredEffectorsF,
		categorizedFilteredEffectorsF,
		categorizedFullFilteredEffectorsF,
		cardinalCategorizedFilteredEffectorsF,
		categoryOfF,
		communeOfF,
		facilityOfF
	} from '$lib/store/directoryStore.ts';
	import FullDirectory from './FullDirectory.svelte';
	import Types from './Types.svelte';
	let {
		data = null,
		displayGeocoder = variables.INPUT_GEOCODER,
		displaySituation = variables.INPUT_SITUATION,
		displayCommune = variables.INPUT_COMMUNE,
		displayCategory = variables.INPUT_CATEGORY,
		displayFacility = variables.INPUT_FACILITY,
		displaySearch = variables.INPUT_SEARCH,
		propCurrentOrg = true,
		setRedirect = true,
		propLimitCategories = [],
		propSelectFacility = null,
		avatar = true,
		typesView = false,
		displayEntries = false,
		types = null
	}: {
		data: any;
		displayGeocoder: boolean;
		displaySituation: boolean;
		displayCommune: boolean;
		displayCategory: boolean;
		displayFacility: boolean;
		displaySearch: boolean;
		propCurrentOrg: boolean | null;
		setRedirect: boolean;
		propLimitCategories: string[];
		propSelectFacility: string | null;
		avatar: boolean;
		typesView: boolean;
		displayEntries: boolean;
		types: string[] | null;
	} = $props();

	setTerm();
	setSelectCategories();
	setLimitCategories();
	setCurrentOrg();
	setDirectoryRedirect();
	setSelectedCommunesUids();
	setSelectedCommunesChoices();
	setSelectSituation();
	setAddressFeature();
	setGeoInputAddress();
	setFacilityChoice();
	setSelectFacility(propSelectFacility);
	setSelCatVal();
	setInputAddress();

	let term = getTerm();
	let selectCategories = getSelectCategories();
	let selectSituation = getSelectSituation();
	let selectCommunes = getSelectedCommunesUids();
	let addressFeature = getAddressFeature();
	let selectFacility = getSelectFacility();
	let directoryRedirect = getDirectoryRedirect();
	let currentOrg = getCurrentOrg();
	let limitCategories = getLimitCategories();

	$currentOrg = propCurrentOrg;
	$directoryRedirect = setRedirect;
	$limitCategories = propLimitCategories;

	const distanceEffectors = asyncDerived([addressFeature], async ([$addressFeature]) => {
		return await distanceEffectorsF($addressFeature);
	});

	setDistanceEffectors(distanceEffectors);

	const fullFilteredEffectors = asyncDerived(
		[selectSituation, currentOrg, organizationStore, limitCategories],
		async ([$selectSituation, $currentOrg, $organizationStore, $limitCategories]) => {
			return await fullFilteredEffectorsF(
				$selectSituation,
				$currentOrg,
				$organizationStore,
				$limitCategories
			);
		}
	);

	const filteredEffectors = asyncDerived(
		[term, fullFilteredEffectors, selectCategories, selectCommunes, selectFacility],
		async ([
			$term,
			$fullFilteredEffectors,
			$selectCategories,
			$selectCommunes,
			$selectFacility
		]) => {
			return filteredEffectorsF(
				$fullFilteredEffectors,
				$selectCategories,
				$selectCommunes,
				$selectFacility,
				$term
			);
		}
	);

	setContext('filteredEffectors', filteredEffectors);

	const categorizedFilteredEffectors = asyncDerived(
		[filteredEffectors, distanceEffectors, selectSituation],
		async ([$filteredEffectors, $distanceEffectors, $selectSituation]) => {
			return categorizedFilteredEffectorsF(
				$filteredEffectors,
				$distanceEffectors,
				$selectSituation
			);
		}
	);

	setContext('categorizedFilteredEffectors', categorizedFilteredEffectors);

	const categorizedFullFilteredEffectors = asyncDerived(
		fullFilteredEffectors,
		async ($fullFilteredEffectors) => {
			return categorizedFullFilteredEffectorsF($fullFilteredEffectors);
		}
	);

	setContext('categorizedFullFilteredEffectors', categorizedFullFilteredEffectors);

	const cardinalCategorizedFilteredEffectors = asyncDerived(
		[categorizedFilteredEffectors, filteredEffectors, addressFeature],
		async ([$categorizedFilteredEffectors, $filteredEffectors, $addressFeature]) => {
			return cardinalCategorizedFilteredEffectorsF($categorizedFilteredEffectors);
		}
	);

	setContext('cardinalCategorizedFilteredEffectors', cardinalCategorizedFilteredEffectors);

	const categoryOf = asyncDerived(
		[selectCommunes, fullFilteredEffectors, selectFacility],
		async ([$selectCommunes, $fullFilteredEffectors, $selectFacility]) => {
			return categoryOfF($selectCommunes, $fullFilteredEffectors, $selectFacility);
		}
	);

	const communeOf = asyncDerived(
		[
			selectCategories,
			fullFilteredEffectors,
			selectFacility,
			currentOrg,
			limitCategories,
			selectSituation
		],
		async ([
			$selectCategories,
			$fullFilteredEffectors,
			$selectFacility,
			$currentOrg,
			$limitCategories,
			$selectSituation
		]) => {
			return communeOfF(
				$selectCategories,
				$fullFilteredEffectors,
				$selectFacility,
				$currentOrg,
				$limitCategories,
				$selectSituation
			);
		}
	);

	const facilityOf = asyncDerived(
		[fullFilteredEffectors, selectCategories, selectCommunes],
		async ([$fullFilteredEffectors, $selectCategories, $selectCommunes]) => {
			return facilityOfF($fullFilteredEffectors, $selectCategories, $selectCommunes);
		}
	);
</script>

{#if typesView}
	<Types {displayEntries} {data} />
{:else}
	<FullDirectory
		{data}
		{displayGeocoder}
		{displaySituation}
		{displayCategory}
		{displayCommune}
		{displayFacility}
		{displaySearch}
		{avatar}
		{communeOf}
		{categoryOf}
		{facilityOf}
		{types}
	/>
{/if}

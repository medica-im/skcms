<script lang="ts">
	import { setContext } from 'svelte';
	import {
		asyncDerived
	} from '@square/svelte-store';
	import {
		setTerm,
		getTerm,
		setSelectCategories,
		getSelectCategories,
		setLimitCategories,
		getLimitCategories,
		setSelectCommunes,
		getSelectCommunes,
		setSelectCommunesValue,
		setSelectSituation,
		getSelectSituation,
		setSelectFacility,
		getSelectFacility,
		setCurrentOrg,
		getCurrentOrg,
		setDirectoryRedirect,
		getDirectoryRedirect,
		setAddressFeature,
		getAddressFeature,
		setSelCatVal,
		setSelectSituationValue,
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

	export let data: any = null;
	export let displayGeocoder: boolean = variables.INPUT_GEOCODER;
	export let displaySituation: boolean = variables.INPUT_SITUATION;
	export let displayCommune: boolean = variables.INPUT_COMMUNE;
	export let displayCategory: boolean = variables.INPUT_CATEGORY;
	export let displayFacility: boolean = variables.INPUT_FACILITY;
	export let displaySearch: boolean = variables.INPUT_SEARCH;
	export let propCurrentOrg: boolean | null = true;
	export let setRedirect: boolean = true;
	export let propLimitCategories: string[] = [];
	export let propSelectFacility: string|null = null;
	export let avatar: boolean = true;
	export let typesView: boolean = false;
	export let displayEntries: boolean = false;
	export let types: string[]|null=null;

	setTerm();
	setSelectCategories();
	setLimitCategories();
	setCurrentOrg();
	setDirectoryRedirect();
	setSelectCommunes();
	setSelectCommunesValue();
	setSelectSituation();
	setSelectSituationValue();
	setAddressFeature();
	setGeoInputAddress();
	setSelectFacility(propSelectFacility);
	setSelCatVal();
	setInputAddress();

	let term = getTerm();
	let selectCategories = getSelectCategories();
	let selectSituation = getSelectSituation();
	let selectCommunes = getSelectCommunes();
	let addressFeature = getAddressFeature();
	let selectFacility = getSelectFacility();
	let directoryRedirect = getDirectoryRedirect();
	let currentOrg = getCurrentOrg();
	let limitCategories = getLimitCategories();

	const distanceEffectors = asyncDerived(
		[addressFeature],
		async ([$addressFeature]) => {
		    return await distanceEffectorsF($addressFeature);
	});

	setDistanceEffectors(distanceEffectors);

	const fullFilteredEffectors = asyncDerived(
		[selectSituation, currentOrg, organizationStore, limitCategories],
		async ([
			$selectSituation,
			$currentOrg,
			$organizationStore,
			$limitCategories
		]) => {
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
		async ([$term, $fullFilteredEffectors, $selectCategories, $selectCommunes, $selectFacility]) => {
			return filteredEffectorsF(
				$fullFilteredEffectors,
				$selectCategories,
				$selectCommunes,
				$selectFacility,
				$term,
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
	)

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
		[selectCategories, fullFilteredEffectors, selectFacility, currentOrg, limitCategories, selectSituation],
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
		[
			selectCategories,
			fullFilteredEffectors,
			selectCommunes,
			currentOrg,
			limitCategories,
			selectSituation,
		],
		async ([
			$selectCategories,
			$fullFilteredEffectors,
			$selectCommunes,
			$currentOrg,
			$limitCategories,
			$selectSituation
		]) => {
			return facilityOfF(
				$selectCategories,
				$fullFilteredEffectors,
				$selectCommunes,
				$currentOrg,
				$limitCategories,
				$selectSituation,
			);
		}
	);

	$: {
		$currentOrg = propCurrentOrg;
		$directoryRedirect = setRedirect;
		$limitCategories = propLimitCategories;
	}
</script>
{#if typesView}
<Types
	{displayEntries}
	{data}
/>
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
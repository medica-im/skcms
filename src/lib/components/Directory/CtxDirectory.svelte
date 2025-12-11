<script lang="ts">
	import { page } from '$app/state';
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
	import {
		distanceEffectorsF,
		fullFilteredEffectorsF,
		filteredEffectorsF,
		categorizedFilteredEffectorsF,
		categorizedFullFilteredEffectorsF,
		cardinalCategorizedFilteredEffectorsF,
		categoryOfF,
		communeOfF,
		facilityOfF,
	} from '$lib/store/directoryStore.ts';
	import FullDirectory from './FullDirectory.svelte';
	import Types from './Types.svelte';
	import type { SelectType } from '$lib/interfaces/select';

	let {
		data = null,
		displayGeocoder = false,
		displaySituation = false,
		displayCommune = true,
		displayCategory = true,
		displayFacility = true,
		displaySearch = true,
		propCurrentOrg = true,
		setRedirect = true,
		propLimitCategories = [],
		propSelectFacility = null,
		avatar = true,
		typesView = false,
		displayEntries = false,
		types = null
	}: {
		data?: any;
		displayGeocoder: boolean;
		displaySituation: boolean;
		displayCommune?: boolean;
		displayCategory: boolean;
		displayFacility?: boolean;
		displaySearch?: boolean;
		propCurrentOrg?: boolean | null;
		setRedirect?: boolean;
		propLimitCategories?: string[];
		propSelectFacility?: string | null;
		avatar: boolean;
		typesView?: boolean;
		displayEntries?: boolean;
		types?: string[] | null;
	} = $props();

	const organization = page.data.organization;

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
		[selectSituation, currentOrg, limitCategories],
		async ([$selectSituation, $currentOrg, $limitCategories]) => {
			return await fullFilteredEffectorsF(
				$selectSituation,
				$currentOrg,
				organization,
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

	//runes
	let rSelectSituation: SelectType|null|undefined = $state($selectSituation);
	let rCurrentOrg = $derived(propCurrentOrg);
	let rDirectoryRedirect = $derived(setRedirect);
	let rLimitCategories = $derived(propLimitCategories);

	const rFullFilteredEntries = $derived(
		await fullFilteredEffectorsF(
				rSelectSituation,
				rCurrentOrg,
				organization,
				rLimitCategories
			)
		);
	$inspect(rFullFilteredEntries);

	let rFilteredEntries = $derived(
		filteredEffectorsF(
				rFullFilteredEntries,
				$selectCategories,
				$selectCommunes,
				$selectFacility,
				$term
			)
	);
	$inspect(rFilteredEntries);

	let communeOf = $derived(communeOfF($selectCategories, rFullFilteredEntries, $selectFacility));
	const facilityOf = $derived(facilityOfF(rFullFilteredEntries, $selectCategories, $selectCommunes));
	const categoryOf = $derived(categoryOfF($selectCommunes,rFullFilteredEntries, $selectFacility));
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
	/>
{/if}

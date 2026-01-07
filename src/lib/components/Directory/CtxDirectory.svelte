<script lang="ts">
	import { page } from '$app/state';
	import { setContext } from 'svelte';
	import { asyncDerived, derived as syncDerived } from '@square/svelte-store';
	import haversine from 'haversine-distance';
	import {
		setTerm,
		getTerm,
		setSelectCategories,
		getSelectCategories,
		setLimitCategories,
		getLimitCategories,
		getSelectedDepartments,
		setSelectedDepartments,
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
		setDistanceEffectors,
		setSelectedTags,
		getSelectedTags
	} from './context';
	import {
		fullFilteredEntriesF,
		filteredEntriesF,
		categorizedFilteredEffectorsF,
		categorizedFullFilteredEffectorsF,
		cardinalCategorizedFilteredEffectorsF,
		categoryOfF,
		communeOfF,
		facilityOfF,
		departmentOfF,
		tagOfF,
	} from '$lib/store/directoryStore.ts';
	import FullDirectory from './FullDirectory.svelte';
	import Types from './Types.svelte';
	import type { SelectType } from '$lib/interfaces/select';
	import type {
		Contact,
		Entry,
		CurrentOrg,
		AddressFeature,
		DistanceEffectors,
		CategorizedEntries,
		Type
	} from '$lib/store/directoryStoreInterface.ts';

	let {
		data = null,
		displayCategory = page.data.directory.inputField.category,
		displayCommune = page.data.directory.inputField.commune,
		displayDepartment = page.data.directory.inputField.department,
		displayFacility = page.data.directory.inputField.facility,
		displayGeocoder = page.data.directory.inputField.geocoder,
		displayOrganization = page.data.directory.inputField.geocoder,
		displaySearch = page.data.directory.inputField.search,
		displaySituation = page.data.directory.inputField.situation,
		displayTag = page.data.directory.inputField.tag,
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
		displayGeocoder?: boolean;
		displaySituation?: boolean;
		displayCommune?: boolean;
		displayDepartment?: boolean;
		displayCategory?: boolean;
		displayFacility?: boolean;
		displayOrganization?: boolean;
		displaySearch?: boolean;
		displayTag?: boolean;
		propCurrentOrg?: boolean | null;
		setRedirect?: boolean;
		propLimitCategories?: string[];
		propSelectFacility?: string | null;
		avatar?: boolean;
		typesView?: boolean;
		displayEntries?: boolean;
		types?: string[] | null;
	} = $props();

	setTerm();
	setSelectCategories();
	setLimitCategories();
	setCurrentOrg();
	setDirectoryRedirect();
	setSelectedDepartments();
	setSelectedCommunesUids();
	setSelectedCommunesChoices();
	setSelectSituation();
	setAddressFeature();
	setGeoInputAddress();
	setFacilityChoice();
	setSelectFacility(propSelectFacility);
	setSelCatVal();
	setInputAddress();
	setSelectedTags();

	let term = getTerm();
	let selectCategories = getSelectCategories();
	let selectSituation = getSelectSituation();
	let selectCommunes = getSelectedCommunesUids();
	let selectDepartments = getSelectedDepartments();
	let selectTags = getSelectedTags();
	let addressFeature = getAddressFeature();
	let selectFacility = getSelectFacility();
	let directoryRedirect = getDirectoryRedirect();
	let currentOrg = getCurrentOrg();
	let limitCategories = getLimitCategories();

	$currentOrg = propCurrentOrg;
	$directoryRedirect = setRedirect;
	$limitCategories = propLimitCategories;

	const situations = $derived(page.data.situations);
	const organization = $derived(page.data.organization);
	const entries = $derived(page.data.entries);
	const effectorTypeLabels = $derived(page.data.labels);

	const distanceEffectorsF = (entries: Entry[], addressFeature: AddressFeature | null) => {
		const targetGeoJSON = addressFeature?.geometry?.coordinates;
		if (!targetGeoJSON) {
			return {};
		}
		const distanceOfEffector: DistanceEffectors = {};
		for (const entry of entries) {
			let longitude = entry.address.longitude;
			let latitude = entry.address.latitude;
			if (!longitude || !latitude) {
				continue;
			}
			const effectorGeoJSON = [parseFloat(longitude), parseFloat(latitude)] as any;
			const dist = haversine(targetGeoJSON, effectorGeoJSON);
			distanceOfEffector[entry.address.facility_uid] = dist;
		}
		return distanceOfEffector;
	};
	const distanceEffectors = syncDerived(addressFeature, ($addressFeature) => {
		return distanceEffectorsF(entries, $addressFeature);
	});
	setDistanceEffectors(distanceEffectors);

	const fullFilteredEffectors = asyncDerived(
		[selectSituation, currentOrg, limitCategories],
		async ([$selectSituation, $currentOrg, $limitCategories]) => {
			return fullFilteredEntriesF(
				situations,
				entries,
				$selectSituation,
				$currentOrg,
				organization,
				$limitCategories
			);
		}
	);

	const filteredEffectors = asyncDerived(
		[term, fullFilteredEffectors, selectCategories, selectDepartments, selectCommunes, selectFacility, selectTags],
		async ([
			$term,
			$fullFilteredEffectors,
			$selectCategories,
			$selectDepartments,
			$selectCommunes,
			$selectFacility,
			$selectTags
		]) => {
			return filteredEntriesF(
				$fullFilteredEffectors,
				$selectCategories,
				$selectDepartments,
				$selectCommunes,
				$selectFacility,
				$term,
				$selectTags
			);
		}
	);
	setContext('filteredEffectors', filteredEffectors);

	const categorizedFilteredEffectors = asyncDerived(
		[filteredEffectors, selectSituation],
		async ([$filteredEffectors, $selectSituation]) => {
			return categorizedFilteredEffectorsF($filteredEffectors, $distanceEffectors, $selectSituation);
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
			return cardinalCategorizedFilteredEffectorsF($categorizedFilteredEffectors, effectorTypeLabels);
		}
	);
	setContext('cardinalCategorizedFilteredEffectors', cardinalCategorizedFilteredEffectors);

	//runes
	let rSelectSituation: SelectType | null | undefined = $state($selectSituation);
	let rCurrentOrg = $derived(propCurrentOrg);
	let rDirectoryRedirect = $derived(setRedirect);
	let rLimitCategories = $derived(propLimitCategories);
	const rFullFilteredEntries = $derived.by(() => {
		return fullFilteredEntriesF(
			situations,
			entries,
			rSelectSituation,
			rCurrentOrg,
			organization,
			rLimitCategories
		);
	});

	const rFilteredEntries = $derived.by(()=>{
		return filteredEntriesF(
				rFullFilteredEntries,
				$selectCategories,
				$selectDepartments,
				$selectCommunes,
				$selectFacility,
				$term,
				$selectTags
			);
		}
	);
	//$inspect("rFullFilteredEntries", rFullFilteredEntries);
	//$inspect("rFilteredEntries", rFilteredEntries);

	const rCategorizedFullFilteredEntries = $derived.by(()=>{
			return categorizedFullFilteredEffectorsF(rFullFilteredEntries);
		}
	);
	//$inspect("rCategorizedFullFilteredEntries", rCategorizedFullFilteredEntries);

	const rCategorizedFilteredEntries = $derived.by(()=>{
		/*[categorizedFilteredEffectors, filteredEffectors, addressFeature],
		async ([$categorizedFilteredEffectors, $filteredEffectors, $addressFeature]) => {*/
			return categorizedFilteredEffectorsF(rFilteredEntries,$distanceEffectors, $selectSituation);
		}
	);
	//$inspect("rCategorizedFilteredEntries", rCategorizedFilteredEntries);

	const rCardinalCategorizedFilteredEntries = $derived.by(()=>{
		/*[categorizedFilteredEffectors, filteredEffectors, addressFeature],
		async ([$categorizedFilteredEffectors, $filteredEffectors, $addressFeature]) => {*/
			return cardinalCategorizedFilteredEffectorsF( rCategorizedFilteredEntries, effectorTypeLabels);
		}
	);
	//$inspect("rCardinalCategorizedFilteredEntries", rCardinalCategorizedFilteredEntries);

	const communeOf = $derived.by(() => {
		return communeOfF(rFullFilteredEntries, $selectCategories, $selectDepartments, $selectFacility);
	});
	const departmentOf = $derived.by(() => {
		return departmentOfF(rFullFilteredEntries, $selectFacility, $selectCategories, $selectCommunes);
	});
	const facilityOf = $derived.by(() => {
		return facilityOfF(rFullFilteredEntries, $selectCategories, $selectCommunes, $selectDepartments);
	});
	const categoryOf = $derived.by(() => {
		return categoryOfF(rFullFilteredEntries, $selectCommunes, $selectDepartments, $selectFacility);
	});
	const tagOf = $derived.by(() => {
		return tagOfF(rFullFilteredEntries, $selectFacility, $selectCategories, $selectCommunes, $selectDepartments, );
	});
</script>

{#if typesView}
	<Types {displayEntries} {data} />
{:else}
	<FullDirectory
		{data}
		{displayCategory}
		{displayCommune}
		{displayDepartment}
		{displayFacility}
		{displayGeocoder}
		{displayOrganization}
		{displaySearch}
		{displaySituation}
		{displayTag}
		{avatar}
		{communeOf}
		{departmentOf}
		{categoryOf}
		{facilityOf}
		{tagOf}
		rCCFE={rCardinalCategorizedFilteredEntries}
	/>
{/if}

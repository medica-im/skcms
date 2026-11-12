<script lang="ts">
	import { page } from '$app/state';
	import haversine from 'haversine-distance';
	import {
		setTerm,
		getTerm,
		setSelectCategories,
		getSelectCategories,
		setLimitCategories,
		getLimitCategories,
		getSelectedDepartment,
		setSelectedDepartment,
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
		setSelectedTags,
		getSelectedTags,
		setSelectedOwners,
		setSelectConcern,
		getSelectConcern,
		setFacetSelection,
		getFacetSelection
	} from './context';
	import { filterByFacets } from '$lib/store/facetFilters.ts';
	import { filterByConcern, seeAlsoOf, type Concern } from '$lib/store/concernTree.ts';
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
	import type {
		Entry,
		AddressFeature,
		DistanceEffectors,
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
		setRedirect = false,
		propLimitCategories = [],
		propSelectFacility = null,
		avatar = true,
		active = true,
		displaySelector = false,
		results = undefined,
		geojson = null,
		concerns = null,
		displayFacets = true,
	}: {
		data?: any;
		/** The conditions and situations the directory offers (GET /api/v2/concerns); none, no selector. */
		concerns?: Concern[] | null;
		/** Whether the facet selectors may show. They show only when the entries could be narrowed by them. */
		displayFacets?: boolean;
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
		active?: boolean | null;
		displaySelector?: boolean;
		/** Renders the filtered outcome instead of the default card list. */
		results?: import('svelte').Snippet<[any[]]>;
		geojson?: any;
	} = $props();

	setTerm();
	setSelectCategories();
	setLimitCategories();
	setCurrentOrg();
	setDirectoryRedirect();
	setSelectedDepartment();
	setSelectedCommunesUids();
	setSelectedCommunesChoices();
	setSelectSituation();
	setSelectConcern();
	setFacetSelection();
	setAddressFeature();
	setGeoInputAddress();
	setFacilityChoice();
	setSelectFacility(propSelectFacility);
	setSelCatVal();
	setInputAddress();
	setSelectedTags();
	if (!displaySelector) setSelectedOwners();

	let term = getTerm();
	let selectCategories = getSelectCategories();
	let selectSituation = getSelectSituation();
	let selectConcern = getSelectConcern();
	let facetSelection = getFacetSelection();
	let selectCommunes = getSelectedCommunesUids();
	let selectDepartment = getSelectedDepartment();
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
	const entries = $derived(data || page.data.entries);
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
	
	//runes
	let rCurrentOrg = $derived(propCurrentOrg);
	let rLimitCategories = $derived(propLimitCategories);
	let rFullFilteredEntries = $derived.by(() => {
		return fullFilteredEntriesF(
			situations,
			entries,
			$selectSituation,
			rCurrentOrg,
			organization,
			rLimitCategories,
			active
		);
	});

	// The facets narrow the list as every user selector does; the picked condition
	// comes last so "voir aussi" can count what the other selectors still let through.
	const rBeforeConcern = $derived.by(() => {
		return filterByFacets(
			filteredEntriesF(
				rFullFilteredEntries,
				$selectCategories,
				$selectDepartment,
				$selectCommunes,
				$selectFacility,
				$term,
				$selectTags
			),
			$facetSelection
		);
	});
	let rFilteredEntries = $derived.by(() => {
		return filterByConcern(rBeforeConcern, concerns ?? [], $selectConcern);
	});
	const seeAlso = $derived(seeAlsoOf(rBeforeConcern, concerns ?? [], $selectConcern));
	//$inspect("rFullFilteredEntries", rFullFilteredEntries);
	//$inspect("rFilteredEntries", rFilteredEntries);

	let rCategorizedFullFilteredEntries = $derived.by(()=>{
			return categorizedFullFilteredEffectorsF(rFullFilteredEntries);
		}
	);
	//$inspect("rCategorizedFullFilteredEntries", rCategorizedFullFilteredEntries);

	let distanceEffectors = $derived(distanceEffectorsF(page.data.entries, $addressFeature));

	let rCategorizedFilteredEntries = $derived.by(()=>{
			return categorizedFilteredEffectorsF(rFilteredEntries,distanceEffectors, $selectSituation);
		}
	);
	//$inspect("rCategorizedFilteredEntries", rCategorizedFilteredEntries);

	const rCardinalCategorizedFilteredEntries = $derived.by(()=>{
			return cardinalCategorizedFilteredEffectorsF( rCategorizedFilteredEntries, effectorTypeLabels);
		}
	);
	//$inspect("rCardinalCategorizedFilteredEntries", rCardinalCategorizedFilteredEntries);

	const communeOf = $derived.by(() => {
		return communeOfF(rFullFilteredEntries, $selectCategories, $selectDepartment, $selectFacility);
	});
	const departmentOf = $derived.by(() => {
		return departmentOfF(rFullFilteredEntries, $selectFacility, $selectCategories, $selectCommunes);
	});
	const facilityOf = $derived.by(() => {
		return facilityOfF(rFullFilteredEntries, $selectCategories, $selectCommunes, $selectDepartment);
	});
	const categoryOf = $derived.by(() => {
		return categoryOfF(rFullFilteredEntries, $selectCommunes, $selectDepartment, $selectFacility);
	});
	const tagOf = $derived.by(() => {
		return tagOfF(rFullFilteredEntries, $selectFacility, $selectCategories, $selectCommunes, $selectDepartment, );
	});
</script>

<svelte:head>
	<link rel="canonical" href="{page.url.origin}{page.url.pathname}" />
</svelte:head>

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
		{displaySelector}
		{communeOf}
		{departmentOf}
		{categoryOf}
		{facilityOf}
		{tagOf}
		rCCFE={rCardinalCategorizedFilteredEntries}
		rCFFE={rCategorizedFullFilteredEntries}
		rFFE={rFilteredEntries}
		{results}
		{geojson}
		{concerns}
		{seeAlso}
		{displayFacets}
		facetEntries={rFullFilteredEntries}
	/>

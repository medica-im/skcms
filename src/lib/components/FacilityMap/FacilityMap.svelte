<script lang="ts">
	import Maplibre from '$lib/MapLibre/MapLibre.svelte';
	import { createEntriesMapData } from '$lib/components/Map/mapData.ts';
	import { page } from '$app/state';
	import type { Entry } from '$lib/store/directoryStoreInterface.ts';
	import { getSelectFacility, getSelectCategories, getTerm, getSelectedCommunesUids, getSelectSituation, getAddressFeature, getDisplayMap, getSelectedTags, getSelectedDepartment } from '$lib/components/Directory/context.ts';

	let { data } : { data: Map<string, Entry[]>; } = $props();
	const entries = $derived(Object.values(Object.fromEntries(data)).flat());

	const org_category = page.data.organization.category.name;
	let addressFeature = getAddressFeature();
	let selectSituation = getSelectSituation();
	let selectFacility = getSelectFacility();
	let selectCategories = getSelectCategories();
	let selectTags = getSelectedTags();
	let selectCommunes = getSelectedCommunesUids();
	let selectDepartment = getSelectedDepartment();
	let displayMap = getDisplayMap();
	let term = getTerm();

	let mapData = $derived(createEntriesMapData(entries, false, $addressFeature, org_category, page.url.pathname, $selectFacility, $selectCategories, $selectTags?.map(t=>t.uid), $term, $selectCommunes, $selectDepartment, $selectSituation?.value, $displayMap));
</script>

<Maplibre data={mapData} showTooltip={false} target={$addressFeature} />
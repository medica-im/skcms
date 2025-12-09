<script lang="ts">
	import Map from '$lib/MapLibre/MapLibre.svelte';
	import { createEntriesMapData } from '$lib/components/Map/mapData.ts';
	import { page } from '$app/state';
	import type { Entry } from '$lib/store/directoryStoreInterface.ts';
	import { getSelectFacility, getSelectCategories, getTerm, getSelectedCommunesUids, getSelectSituation, getAddressFeature, getDisplayMap } from '$lib/components/Directory/context.ts';

	let { data } : { data: Entry[]; } = $props();

	const org_category = page.data.organization.category.name;
	let addressFeature = getAddressFeature();
	let selectSituation = getSelectSituation();
	let selectFacility = getSelectFacility();
	let selectCategories = getSelectCategories();
	let selectCommunes = getSelectedCommunesUids();
	let displayMap = getDisplayMap();
	let term = getTerm();

	let mapData = $derived(createEntriesMapData(data, false, $addressFeature, org_category, page.url.pathname, $selectFacility, $selectCategories, $term, $selectCommunes, $selectSituation?.value, $displayMap));
</script>

<Map data={mapData} showTooltip={false} target={$addressFeature} />
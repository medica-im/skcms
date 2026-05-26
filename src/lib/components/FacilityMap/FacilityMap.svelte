<script lang="ts">
	import Maplibre from '$lib/MapLibre/MapLibre.svelte';
	import { createEntriesMapData } from '$lib/components/Map/mapData.ts';
	import { page } from '$app/state';
	import type { Entry } from '$lib/store/directoryStoreInterface.ts';
	import { getAddressFeature } from '$lib/components/Directory/context.ts';

	let { data, geojson = null } : { data: Map<string, Entry[]>; geojson?: any } = $props();
	const entries = $derived(Object.values(Object.fromEntries(data)).flat());

	const org_category = page.data.organization.category.name;
	let addressFeature = getAddressFeature();

	let mapData = $derived(createEntriesMapData(entries, false, $addressFeature, org_category));
</script>

<Maplibre data={mapData} showTooltip={false} target={$addressFeature} {geojson} />
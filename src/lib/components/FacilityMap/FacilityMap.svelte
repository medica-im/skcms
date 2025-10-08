<script lang="ts">
	import Map from '$lib/components/Map/Map.svelte';
	import { createEntriesMapData } from '$lib/components/Map/mapData.ts';
	import { page } from '$app/state';
	import type { Entry } from '$lib/store/directoryStoreInterface.ts';
	import type { AddressFeature } from '$lib/store/directoryStoreInterface.ts';

	let { data, addressFeature } : { data: Entry[]; addressFeature: AddressFeature|null; } = $props();
	const org_category = page.data.organization.category.name;
	let mapData = $derived(createEntriesMapData(data, false, addressFeature, org_category));
</script>

	{#key data}
	<Map data={mapData} />
	{/key}
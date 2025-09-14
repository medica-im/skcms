<script lang="ts">
	import Map from '$lib/components/Map/Map.svelte';
	import { createEntriesMapData } from '$lib/components/Map/mapData.ts';
	import { page } from '$app/state';
	import type { Entry } from '$lib/store/directoryStoreInterface.ts';
	import type { AddressFeature } from '$lib/store/directoryStoreInterface.ts';

	export let data: Entry[];
	export let addressFeature: AddressFeature|null;
	const org_category = page.data.organization.category.name;
</script>

	{#key data}
	<Map data={createEntriesMapData(data, false, addressFeature, org_category)} />
	{/key}
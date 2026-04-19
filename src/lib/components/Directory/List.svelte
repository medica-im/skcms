<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import Spinner from '$lib/Spinner/Spinner.svelte';
	import EntryGroup from '$lib/components/Directory/EntryGroup.svelte';
	import EntrySelector from '$lib/components/Directory/EntrySelector.svelte';
	import Clear from '$lib/components/Directory/Clear.svelte';
	import MapSelector from './MapSelector.svelte';
	import FacilityMap from '../FacilityMap/FacilityMap.svelte';
	import { setDisplayMap, getDisplayMap } from '$lib/components/Directory/context.ts';
	import type { Entry } from '$lib/store/directoryStoreInterface';

	let { data, avatar = true, displaySelector = false, geojson = null }: { data: Map<string, Entry[]>; avatar: boolean; displaySelector: boolean; geojson?: any } = $props();
	setDisplayMap();
	const displayMap = getDisplayMap();

	onMount(async () => {
		$displayMap = page.url.searchParams.has('map');
	});
	function contactCount(entryMap: Map<string,Entry[]>) {
		let count = 0;
		if (entryMap) {
			count = [...entryMap.values()].flat().length;
		}
		return `${count} contact${count > 1 ? 's' : ''}`;
	}
	let displayCount = $derived(contactCount(data));
</script>

<div class="flex justify-end lg:justify-between w-full gap-2">
	<span class="badge variant-soft"> {displayCount}</span>
	<MapSelector bind:data={$displayMap} />
	<Clear />
</div>
<div class="m-4 space-y-4">
	{#if data}
		{#if $displayMap}
			<div class="h-screen px-4 z-0">
				<FacilityMap {data} {geojson} />
			</div>
		{:else if displaySelector}
			<EntrySelector {data} {avatar} />
		{:else}
			<EntryGroup {data} {avatar} />
		{/if}
	{/if}
</div>

<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { getContext } from 'svelte';
	import Spinner from '$lib/Spinner/Spinner.svelte';
	import EntryComponent from '$lib/components/Directory/Entry.svelte';
	import Clear from '$lib/components/Directory/Clear.svelte';
	import MapSelector from './MapSelector.svelte';
	import FacilityMap from '../FacilityMap/FacilityMap.svelte';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers.ts';
	import { getAddressFeature, setDisplayMap, getDisplayMap } from '$lib/components/Directory/context.ts';
	import type { Entry } from '$lib/store/directoryStoreInterface';
    import type { Loadable } from '@square/svelte-store';

	let {
		data,
		avatar = true,
		loading = true
	}: { data: any; avatar: boolean; loading: boolean } = $props();
	setDisplayMap();
	const displayMap = getDisplayMap();
	let addressFeature = getAddressFeature();
	const filteredEffectors: Loadable<Entry[]> = getContext('filteredEffectors');

	onMount(async () => {
		$displayMap = page.url.searchParams.has('map');
	});

	function contactCount(_categorizedFilteredEffectors: any) {
		let count = 0;
		if (_categorizedFilteredEffectors) {
			count = [..._categorizedFilteredEffectors.values()].flat().length;
		}
		return `${count} contact${count > 1 ? 's' : ''}`;
	}
</script>
<div class="flex justify-end lg:justify-between w-full gap-2">
	<span class="badge variant-soft">
		{contactCount(data)}</span>
	<MapSelector bind:data={$displayMap} />
	<Clear />
</div>
<div class="m-4 space-y-4">
	{#if $displayMap}
		<div class="h-screen px-4 z-0">
            {#await filteredEffectors.load()}
			<Spinner w={12} h={12} />
			{:then}
			<FacilityMap data={$filteredEffectors} />
            {/await}
		</div>
	{:else}
	{#if data}
		{#each [...data] as [key, value]}
			<div class="my-6 anchordiv" id={key}>
				<div class="relative inline-block">
					<span class="badge-icon variant-filled-primary absolute -top-1 -right-2 z-5 p-0 m-0">
						{value.length}
					</span>

					<span class="flex badge variant-filled m-0 px-6 py-2 justify-center items-center"><h5 class="h5"><div class="text-wrap max-w-64 md:text-nowrap md:max-w-fit">{#if key}{capitalizeFirstLetter(key)}{/if}</div></h5></span>
				</div>
			</div>
			<div class="grid grid-cols-1 lg:grid-cols-2 lg:gap-x-16 lg:gap-y-8 space-y-4">
				{#each value as entry}
					<EntryComponent {entry} {avatar} />
				{/each}
			</div>
		{/each}
		{/if}
	{/if}
</div>

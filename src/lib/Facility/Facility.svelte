<script lang="ts">
	import FacilityCarousel from '$lib/Facility/FacilityCarousel.svelte';
	import Map from '$lib/MapLibre/MapLibre.svelte';
	import { createFacilitiesMapData } from '$lib/components/Map/mapData.ts';
	import { scale } from 'svelte/transition';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import * as m from '$msgs';
	import type { Facility } from '$lib/interfaces/facility.interface.js';
	import { JsonView } from '@zerodevx/svelte-json-view';

	let { data, carousel=true }: { data: Facility[]; carousel?: boolean } = $props();

	const lgCols = carousel ? 3 : 2;
	function filterFacilities(facilities: Facility[]) {
		const f = facilities.filter((facility) =>
			facility.avatar !== null
		);
		return f;
	}

	const carouselFacilities = $derived(filterFacilities(data));

	function compareFn(a: Facility, b:Facility) {
		return b.entries.length - a.entries.length;
	}
</script>

<div class="grid grid-cols-1 lg:grid-cols-{lgCols} gap-6 lg:gap-10 items-start">
	<div class="lg:col-span-3 text-center">
		<h2 class="h2">{capitalizeFirstLetter(m.SITE_COUNT({ count: data.length }))}</h2>
	<p>{m.OUR_FACILITIES({ count: data.length })}</p>
	</div>

	<div class="flex flex-wrap items-center gap-4 text-center">
		{#each data.sort(compareFn) as facility}
				<a
					href="/sites/{facility.slug||facility.uid}"
					title={facility.name}
					class="btn btn-sm variant-ghost-primary w-fit">{facility.label || facility.name}</a
				>
		{/each}
	</div>
	<div in:scale class="h-64 z-0">
		<Map data={createFacilitiesMapData(data, true)} showTooltip={true} />
	</div>
	{#if carouselFacilities.length && carousel}
		<div class="place-items-center items-center justify-center content-center">
			<FacilityCarousel data={data.filter((f: Facility)=>{return f.avatar!==null})} />
		</div>
	{/if}
</div>
<!--{#if import.meta.env.DEV}
	<details class="p-2">
		<summary class="cursor-pointer text-sm text-surface-500">JSON</summary>
		<JsonView json={data} depth={1} />
	</details>
{/if}-->

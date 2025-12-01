<script lang="ts">
	import FacilityCarousel from '$lib/Facility/FacilityCarousel.svelte';
	import MapLeaflet from '$lib/MapLeaflet/MapLeaflet.svelte';
	import { createFacilitiesMapData } from '$lib/MapLeaflet/mapData.js';
	import { scale } from 'svelte/transition';
	import type { Facility } from '$lib/interfaces/facility.interface.js';

	let { data } = $props();

	function filterFacilities(facilities: Facility[]) {
		const f = facilities.filter((facility) =>
			facility.avatar !== null
		);
		return f;
	}

	const carouselFacilities = filterFacilities(data);

	function title() {
		const title = data?.facilities?.length > 1 ? 'Sites' : 'Site';
		return title;
	}
	function compareFn(a: Facility, b:Facility) {
		return b.entries.length - a.entries.length;
	}
</script>

<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-10">
	<div class="space-y-4 text-center">
		<h2 class="h2">{title()}</h2>
		{#each data.sort(compareFn) as facility}
			<div>
				<a
					href="/sites/{facility.slug}"
					title={facility.name}
					class="btn variant-ghost-primary w-fit">{facility.label || facility.name}</a
				>
			</div>
		{/each}
	</div>
	<div in:scale class="h-64 z-0">
		<MapLeaflet data={createFacilitiesMapData(data, true)} />
	</div>
	{#if carouselFacilities.length}
		<div class="place-items-center items-center justify-center content-center">
			<FacilityCarousel data={data.filter((f: Facility)=>{return f.avatar!==null})} />
		</div>
	{/if}
</div>

<script lang="ts">
	import FacilityCarousel from '$lib/Facility/FacilityCarousel.svelte';
	import Map from '$lib/MapLibre/MapLibre.svelte';
	import { createFacilitiesMapData } from '$lib/components/Map/mapData.ts';
	import { scale } from 'svelte/transition';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import * as m from '$msgs';
	import Fa from 'svelte-fa';
	import { faBuilding } from '@fortawesome/free-regular-svg-icons';
	import { page } from '$app/state';
	import type { Facility } from '$lib/interfaces/facility.interface.js';
	import { base } from '$app/paths';

	// mapAnchor: whether a map marker's popup links to the facility it marks.
	// On by default because this component draws a *list* of facilities — the
	// buttons above the map link each one, and a marker that names a place
	// without reaching it is a dead end. A caller rendering the map on the
	// facility's own page passes false, where the link would point at the page
	// you are already reading.
	let { data, carousel=true, geojson=null, mapAnchor=true }: { data: Facility[]; carousel?: boolean; geojson?: any; mapAnchor?: boolean } = $props();

	const isMsp = $derived(page.data.organization?.category?.slug === 'msp');
	const heading = $derived(
		isMsp
			? capitalizeFirstLetter(m.SITE_COUNT({ count: data.length }))
			: capitalizeFirstLetter(m.FACILITY({ count: data.length }))
	);
	const allLabel = $derived(isMsp ? m.SITES_ALL() : m.FACILITIES_ALL());

	const lgCols = carousel ? 3 : 2;
	/**
	 * Only facilities with a picture belong in the carousel — an empty frame
	 * says nothing. Either kind counts: the wide photograph of the place, or
	 * the older square avatar for those not yet migrated.
	 */
	function filterFacilities(facilities: Facility[]) {
		return facilities.filter((facility) => facility.image != null || facility.avatar != null);
	}

	const carouselFacilities = $derived(filterFacilities(data));

	function compareFn(a: Facility, b:Facility) {
		return b.entries.length - a.entries.length;
	}
</script>

<div class="grid grid-cols-1 lg:grid-cols-{lgCols} gap-6 lg:gap-10 items-start">
	<div class="lg:col-span-3 text-center">
		<h2 class="h2">{heading}</h2>
	<p>{m.OUR_FACILITIES({ count: data.length })}</p>
	</div>

	<div class="flex flex-wrap items-center gap-4 text-center">
		{#each data.sort(compareFn) as facility}
				<a
					href="{base}/sites/{facility.slug||facility.uid}"
					title={facility.name}
					class="btn btn-sm variant-ghost-primary w-fit">{facility.label || facility.name}</a
				>
		{/each}
		{#if data.length > 1}
			<a href="{base}/sites" class="btn variant-ghost-surface" data-sveltekit-preload-data="hover">
				<span><Fa icon={faBuilding} /></span><span>{allLabel}</span>
			</a>
		{/if}
	</div>
	<div in:scale class="h-64 z-0">
		<Map data={createFacilitiesMapData(data, true, mapAnchor)} showTooltip={true} {geojson} />
	</div>
	{#if carouselFacilities.length && carousel}
		<div class="place-items-center items-center justify-center content-center">
			<!-- The same list the {#if} above tested, rather than a second filter
			     that could drift out of step with it. -->
			<FacilityCarousel data={carouselFacilities} />
		</div>
	{/if}
</div>

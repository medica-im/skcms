<script lang="ts">
	import * as m from '$msgs';
	import { MapLibre, MapEvents, DefaultMarker } from 'svelte-maplibre';
	import '$lib/MapLibre/worker';
	import { openStreetMap } from '$lib/MapLibre/style/openStreetMap';
	import type { MapMouseEvent } from 'maplibre-gl';
	import { hasCoordinates, distanceKm } from '$lib/components/Map/coordinates.ts';
	import { communeCentre } from '$lib/components/Geocoder/communeCentre.ts';

	let {
		lng = $bindable(),
		lat = $bindable(),
		zoom = $bindable(),
		commune = null,
		departmentCode = null
	}: {
		lng: number | string | null;
		lat: number | string | null;
		zoom: number;
		commune?: string | null;
		departmentCode?: string | null;
	} = $props();

	const FRANCE: [number, number] = [46.6, 2.4];
	const FAR_FROM_COMMUNE_KM = 20;

	let centre: [number, number] | null = $state(null);

	$effect(() => {
		if (!commune) return;
		communeCentre(commune, departmentCode).then((c) => (centre = c));
	});

	const placed = $derived(hasCoordinates(lat, lng));
	const view = $derived.by(() => {
		if (placed) return { lng: Number(lng), lat: Number(lat), zoom };
		if (centre) return { lng: centre[1], lat: centre[0], zoom: 13 };
		return { lng: FRANCE[1], lat: FRANCE[0], zoom: 5 };
	});
	const distance = $derived(
		placed && centre ? Math.round(distanceKm([Number(lat), Number(lng)], centre)) : 0
	);

	function recordLngLat(e: MapMouseEvent) {
		lng = e.lngLat.lng;
		lat = e.lngLat.lat;
	}
</script>

<div class="relative w-full">
	{#key [view.lng, view.lat, view.zoom]}
		<MapLibre
			style={openStreetMap}
			class="relative aspect-[9/16] max-h-[70vh] w-full sm:aspect-video sm:max-h-full"
			standardControls
			center={{ lng: view.lng, lat: view.lat }}
			zoom={view.zoom}
		>
			<MapEvents onclick={recordLngLat} />
			{#if placed}
				<DefaultMarker lngLat={{ lng: Number(lng), lat: Number(lat) }} />
			{/if}
		</MapLibre>
	{/key}
	<p
		class="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 w-max max-w-[90%] text-center rounded-container-token bg-surface-50/90 px-3 py-1 text-sm shadow dark:bg-surface-900/90"
		data-testid="add-marker-hint"
	>
		{placed ? m.FACILITY_GPS_MOVE_HINT() : m.FACILITY_GPS_PLACE_HINT()}
	</p>
</div>
{#if distance > FAR_FROM_COMMUNE_KM}
	<p role="alert" class="text-sm text-warning-700-200-token" data-testid="add-marker-far">
		{m.FACILITY_GPS_FAR_FROM_COMMUNE({ distance, commune: commune ?? '' })}
	</p>
{/if}

<script lang="ts">
	import { browser } from '$app/environment';
	import Fa from 'svelte-fa';
	import { faLocationDot, faArrowsToCircle } from '@fortawesome/free-solid-svg-icons';
	import { bbox } from '@turf/bbox';
	import { lineString } from '@turf/helpers';
	import { MapLibre, type Map } from 'svelte-maplibre';
	import type { LngLatBoundsLike } from 'maplibre-gl';
	import type { MapData } from '$lib/interfaces/mapData.interface.js';
	import Bound from './Bound.svelte';
	import {
		Control,
		ControlGroup,
		ControlButton,
		DefaultMarker,
		Marker,
		Popup
	} from 'svelte-maplibre';
	import * as openStreetMap from '$lib/MapLibre/style/openStreetMap.json';
	
	let {
		data,
		showTooltip = false
	}: {
		data: MapData[];
		showTooltip: boolean;
	} = $props();

	const padding = { top: 60, bottom: 45, left: 115, right: 70 };
	let bounds: LngLatBoundsLike|undefined = $derived.by(() => {
		const coordinates = data?.map((e) => [e.latLng[1], e.latLng[0]]);
		if (data?.length > 1) {
			var line = lineString(coordinates);
			return bbox(line) as [number, number, number, number];
		} else {
			return undefined;
		}
	});
	function getCenter() {
		let latLng = data[0].latLng;
		const lngLat = latLng.slice().reverse() as [number, number];
		return lngLat;
	}
</script>

<MapLibre
	class="h-full"
	standardControls
	style={openStreetMap}
	attributionControl={false}
	{bounds}
>
	{#snippet children({ map })}
		{#if data.length > 1}
			<!--Bound coordinates={coordinates} {padding}/-->
		{/if}
		<Control class="flex flex-col gap-y-2">
			<ControlGroup>
				{#if data.length > 1}
					<ControlButton onclick={() => map.fitBounds(bounds, { padding: padding })}
						><div class="variant-filled"><Fa size="lg" icon={faArrowsToCircle} /></div>
					</ControlButton>
				{:else}
					<ControlButton
						onclick={() => {
							map.flyTo({
								center: getCenter(),
								zoom: data[0].zoom
							});
						}}
					>
						<div class="variant-filled">
							<Fa size="lg" icon={faArrowsToCircle} />
						</div>
					</ControlButton>
				{/if}
			</ControlGroup>
		</Control>
		{#each data as { latLng, tooltip, popup }}
			<DefaultMarker lngLat={latLng.slice().reverse() as [number, number]}>
				<Popup offset={[0, -10]}>
					<div class="font-bold">{@html popup?.text}</div>
				</Popup>
			</DefaultMarker>
			<!--Marker lngLat={latLng.slice().reverse() as [number, number]}>
				<div class="relative inline-block">
					<span class="chip variant-filled absolute -top-8 -right-5 z-10">
						{tooltip?.text}
					</span>
					<Fa size="4x" icon={faLocationDot} color="grey"/>
				</div>
				{#if showTooltip}
				<div class="relative markerContainer">
				<div class="variant-filled marker z-10 text-base px-2">
					{tooltip?.text}
				</div>
				</div>
				{/if}	
			<Popup {lngLat} open={true} offset={[-10, 0]} anchor="right">
      <div class="badge variant-filled">{name}</div>
    </Popup>
		</Marker-->
		{/each}
	{/snippet}
</MapLibre>

<style lang="postcss">
	div.marker {
		position: center;
		border: 1px solid;
	}
	div.markerContainer {
		position: relative;
		top: 25px;
		left: 0px;
	}
</style>

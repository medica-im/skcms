<script lang="ts">
	import { browser } from '$app/environment';
	import Fa, { FaLayers } from 'svelte-fa';
	import { faLocationDot, faArrowsToCircle, faHome } from '@fortawesome/free-solid-svg-icons';
	import { bbox } from '@turf/bbox';
	import { lineString } from '@turf/helpers';
	import { MapLibre, type Map } from 'svelte-maplibre';
	import type { LngLatBoundsLike, FitBoundsOptions, LngLatLike } from 'maplibre-gl';
	import type { MapData } from '$lib/interfaces/mapData.interface.js';
	import type { AddressFeature } from '$lib/store/directoryStoreInterface';
	import {
		Control,
		ControlGroup,
		ControlButton,
		DefaultMarker,
		Marker,
		Popup,
		GeoJSON,
		FillLayer,
		LineLayer
	} from 'svelte-maplibre';
	import * as openStreetMap from '$lib/MapLibre/style/openStreetMap.json';

	let {
		data,
		showTooltip = false,
		target = null,
		geojson = null
	}: {
		data: MapData[];
		showTooltip?: boolean;
		target?: AddressFeature | null;
		geojson?: any;
	} = $props();

	let targetLngLat: LngLatLike | undefined = $derived(
		target ? [target.geometry.coordinates[0], target.geometry.coordinates[1]] : undefined
	);
	const bboxElements = (b: LngLatBoundsLike | undefined) => {
		if (b == undefined || b == null) return 0;
		const obj = Object.values(b);
		const set = new Set(obj);
		const size = set.size || 0;
		return size;
	};
	const padding = { top: 60, bottom: 45, left: 115, right: 70 };
	let bounds: LngLatBoundsLike | undefined = $derived.by(() => {
		if (!data) return;
		if (data?.length > 1) {
			const coordinates = data?.map((e) => [e.latLng[1], e.latLng[0]]);
			if (targetLngLat) coordinates.push(targetLngLat);
			if (!coordinates) return;
			const line = lineString(coordinates);
			if (line == undefined || line == null) return;
			const b = bbox(line) as [number, number, number, number];
			const size = bboxElements(b);
			if (size > 2) {
				return b;
			} else {
				return undefined;
			}
		}
	});
	let zoom = $derived.by(() => {
		if (!data?.length) return 15;
		if (data.length == 1 || bboxElements(bounds) < 4) {
			return data[0].zoom || 15;
		}
	});
	let center = $derived.by(() => {
		if (!data?.length) return undefined;
		const c = data[0].latLng.slice().reverse() as [number, number];
		if (data?.length == 1) {
			return c;
		} else {
			const size = bboxElements(bounds);
			if (size < 4) {
				return c;
			}
		}
	});
	function getCenter() {
		let latLng = data[0].latLng;
		const lngLat = latLng.slice().reverse() as [number, number];
		return lngLat;
	}
</script>

<!--
zoom: '{JSON.stringify(zoom)}'<br>
bounds: '{JSON.stringify(bounds||{})}'<br>
typeof bounds: '{typeof bounds}'<br>
{Object.values(bounds||{}).length}<br>
{display(Object.values(bounds||{}))}
{bboxElements(bounds)}
{JSON.stringify([target?.geometry.coordinates[0], target?.geometry.coordinates[1]])}<br>
{target?.geometry?.coordinates}<br>
{target?.geometry?.coordinates[0]}, {target?.geometry?.coordinates[1]}<br>
{typeof target?.geometry?.coordinates[0]}<br>
{typeof target?.geometry?.coordinates}<br>
{Array.isArray(typeof target?.geometry?.coordinates)}
-->
<MapLibre
	class="h-full"
	standardControls
	style={openStreetMap}
	attributionControl={false}
	{bounds}
	{zoom}
	{center}
	fitBoundsOptions={{ padding: { top: 45, bottom: 15, left: 20, right: 20 } }}
>
	{#snippet children({ map })}
		<Control class="flex flex-col gap-y-3">
			<ControlGroup>
				{#if targetLngLat}
					<ControlButton
						onclick={() =>
							map.flyTo({
								center: targetLngLat,
								zoom: 15
							})}
						><div class="variant-filled"><Fa size="lg" icon={faHome} /></div>
					</ControlButton>
				{/if}
				{#if data.length > 1 && bounds}
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
				{#if popup}
					<Popup offset={[0, -10]} openOn={showTooltip ? 'manual' : 'click'} open={showTooltip}>
						<div class="p-1 m-0 font-bold">{@html popup?.text}</div>
					</Popup>
				{/if}
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
		{#if targetLngLat}
			<Marker lngLat={targetLngLat}>
				<FaLayers size="3x" style="background: none">
					<Fa icon={faLocationDot} color="tomato" />
					<Fa icon={faHome} scale={0.45} translateY={-0.08} color="white" />
				</FaLayers>
			</Marker>
		{/if}
		{#if geojson}
			<GeoJSON id="geojson-polygon" data={geojson}>
				<FillLayer
					paint={{
						'fill-color': '#006600',
						'fill-opacity': 0.15,
					}}
					beforeLayerType="symbol"
				/>
				<LineLayer
					layout={{ 'line-cap': 'round', 'line-join': 'round' }}
					paint={{ 'line-color': '#003300', 'line-width': 2 }}
					beforeLayerType="symbol"
				/>
			</GeoJSON>
		{/if}
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
	:global(.maplibregl-popup-content) {
		padding: 0px;
		color: #000;
	}
</style>

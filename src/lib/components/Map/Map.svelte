<script lang="ts">
	import '../../../../node_modules/leaflet/dist/leaflet.css';
	import { DEFAULT_TILE_LAYER_OPTIONS, DEFAULT_TILE_URL } from './common.js';
	import { browser } from '$app/environment';
	import { Marker, LeafletMap, TileLayer, Tooltip, Icon, Popup } from 'svelte-leafletjs?client';
	import type { MapOptions } from 'leaflet';
	import type { MapData } from '$lib/interfaces/mapData.interface.ts';
	import { onMount } from 'svelte';
	export let data: MapData[];

	let leafletMap: LeafletMap;
	let innerWidth = 0;
    $: isMobile = innerWidth <= 430;

	const getPoints = () => {
		return data.map((x) => x.latLng);
	};

	const getMapOptions = ():MapOptions|null => {
        if (data.length == 1) {
			return {
				center: data[0].latLng,
				zoom: data[0].zoom
			}
		} else {
			return {
				zoom: 0
			}
		}
	};

	onMount(() => {
		if ( data.length>1 ) {
			if (leafletMap) {
		    leafletMap.getMap().fitBounds(getPoints());
			}
		}
	});
</script>

<svelte:window bind:innerWidth />
{#if browser}
	<LeafletMap bind:this={leafletMap} options={getMapOptions()}  class="z-0">
		<TileLayer url={DEFAULT_TILE_URL} options={DEFAULT_TILE_LAYER_OPTIONS} />
		{#each data as point}
			<Marker latLng={point.latLng}>
				{#if point?.iconUrl}
				<Icon iconUrl={point?.iconUrl} options={point?.iconOptions}/>
				{/if}
				{#if point?.popup?.text}
					<Popup>{@html point?.popup?.text}</Popup>
				{/if}
				{#if point?.tooltip?.text  && !isMobile}
					<Tooltip
						options={{
							permanent: point?.tooltip?.permanent||false,
							direction: point?.tooltip?.direction||'auto',
							opacity: point?.tooltip?.opacity||0.9,
						}}>{@html point?.tooltip?.text}</Tooltip
					>
				{/if}
			</Marker>
		{/each}
	</LeafletMap>
{/if}
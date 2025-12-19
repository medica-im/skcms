<script lang="ts">
	import { MapLibre, MapEvents, DefaultMarker } from 'svelte-maplibre';
	import type { MapMouseEvent } from 'maplibre-gl';

    let { lng = $bindable(), lat = $bindable(), zoom = $bindable() }: { lng: number, lat: number, zoom: number } = $props();

	function recordLngLat(e: MapMouseEvent) {
		lng = e.lngLat.lng;
		lat = e.lngLat.lat;
	}
</script>
{#key [lng, lat]}
<MapLibre
	style="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
	class="relative aspect-[9/16] max-h-[70vh] w-full sm:aspect-video sm:max-h-full"
	standardControls
    center={{lng: lng, lat: lat}}
    zoom={zoom}
>
	<!-- MapEvents gives you access to map events even from other components inside the map, where you might not have access to the top-level `MapLibre` component. In this case it would also work to just use on:click on the MapLibre component itself. -->
	<MapEvents onclick={recordLngLat} />
		<DefaultMarker lngLat={{lng: lng, lat: lat}} />
</MapLibre>
{/key}

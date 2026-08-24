<script lang="ts">
	import { browser } from '$app/environment';
	import { untrack } from 'svelte';
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
	import { openStreetMap } from '$lib/MapLibre/style/openStreetMap';

	let {
		data,
		showTooltip = false,
		target = null,
		geojson = null,
		highlight = null
	}: {
		data: MapData[];
		showTooltip?: boolean;
		target?: AddressFeature | null;
		geojson?: any;
		/**
		 * Draw one marker larger and dim the rest, matched on its popup html.
		 *
		 * Every point stays on the map: `bounds` is derived from `data`, so
		 * removing the others would refit the view and the map would jump. The
		 * emphasis is purely visual — the reader keeps their bearings.
		 */
		highlight?: string | null;
	} = $props();

	/** MapLibre's own default pin blue, so the map looks unchanged. */
	const MARKER_COLOUR = '#3FB1CE';

	let mapInstanceState: Map | null = $state(null);

	/**
	 * Put the view back over every marker when a new facility is highlighted.
	 *
	 * The reader may have panned or zoomed since the map loaded — the highlighted
	 * pin could easily be off screen, and emphasising something nobody can see is
	 * no help. Refitting on each new highlight guarantees the pin it is drawing
	 * attention to is actually in frame.
	 *
	 * Only on a *new* highlight, never on clearing one: snapping the camera back
	 * as the pointer leaves a button would yank the map around under the reader.
	 */
	const FIT_OPTIONS = { padding: { top: 45, bottom: 15, left: 20, right: 20 }, duration: 400 };

	$effect(() => {
		// Depend on `highlight` alone. Reading bounds/data/mapInstance tracked
		// would refit the view whenever any of them is recomputed, not only when
		// a new facility is picked — and an effect that reads what it can cause
		// to change is how the clustered map ended up in an
		// effect_update_depth_exceeded loop.
		if (!highlight) return;
		const mapInstance = untrack(() => mapInstanceState);
		if (!mapInstance) return;
		const b = untrack(() => bounds);
		if (b && bboxElements(b) > 2) {
			mapInstance.fitBounds(b as [number, number, number, number], FIT_OPTIONS);
		} else if (data.length) {
			mapInstance.easeTo({
				center: [data[0].latLng[1], data[0].latLng[0]],
				zoom: data[0].zoom || 15,
				duration: 400
			});
		}
	});

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
	/**
	 * Where a popup sits relative to its marker.
	 *
	 * Two facilities can be metres apart — the CPTS and the cabinet infirmier in
	 * Lyon 3 are 56m, which is 4px at zoom 13 — and MapLibre picks the anchor
	 * itself, so both cards land in the same place and overlap. The address
	 * carries a `tooltip_direction` for exactly this (top/bottom/left/right in
	 * the backend's Address model); it reached MapData but nothing here read it,
	 * left behind when the map moved off Leaflet. Setting opposite directions on
	 * two neighbours separates their cards.
	 *
	 * The two libraries name this from opposite ends: Leaflet's `direction` is
	 * where the tooltip goes, MapLibre's `anchor` is the edge of the popup that
	 * touches the point. A popup *above* its marker is therefore anchored
	 * "bottom". Undefined (or "auto") leaves MapLibre to choose, as before.
	 */
	const ANCHOR_FOR_DIRECTION = {
		top: 'bottom',
		bottom: 'top',
		left: 'right',
		right: 'left'
	} as const;

	function popupAnchor(direction: string | undefined) {
		return ANCHOR_FOR_DIRECTION[direction as keyof typeof ANCHOR_FOR_DIRECTION];
	}

	/** Clear of the marker on the axis the popup extends along. */
	function popupOffset(direction: string | undefined): [number, number] {
		switch (direction) {
			case 'bottom':
				return [0, 10];
			case 'left':
				return [-10, 0];
			case 'right':
				return [10, 0];
			default:
				// "top" and anything unset: the previous behaviour.
				return [0, -10];
		}
	}

	const padding = { top: 60, bottom: 45, left: 115, right: 70 };
	/**
	 * The camera props are handed to <MapLibre> **once**, not kept in sync.
	 *
	 * svelte-maplibre declares center/zoom/bounds as $bindable and writes the
	 * map's own values back to them on every `moveend` (see its MapLibre.svelte,
	 * "map.on('moveend', ...)"). A $derived cannot be written to, so each
	 * write-back was discarded and the derivation recomputed — returning a
	 * *new* bbox array, which its own $effect then compared against the map,
	 * found different, and answered with another fitBounds. That fires moveend,
	 * and round it goes: effect_update_depth_exceeded after a handful of hovers,
	 * with the map frozen from then on.
	 *
	 * Snapshotting them into plain $state breaks the cycle: the initial view is
	 * still computed from the data, but afterwards the map owns its own camera
	 * and nothing recomputes underneath it. Moving the view is done by calling
	 * fitBounds on the instance, which is what the hover effect and the
	 * recentre control already do.
	 */
	const computeBounds = (): LngLatBoundsLike | undefined => {
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
	};

	const computeZoom = (b: LngLatBoundsLike | undefined) => {
		if (!data?.length) return 15;
		if (data.length == 1 || bboxElements(b) < 4) {
			return data[0].zoom || 15;
		}
	};

	const computeCenter = (b: LngLatBoundsLike | undefined) => {
		if (!data?.length) return undefined;
		const c = data[0].latLng.slice().reverse() as [number, number];
		if (data?.length == 1) return c;
		return bboxElements(b) < 4 ? c : undefined;
	};

	// Computed once, at setup. `bounds` stays a live derivation because the
	// recentre control and the hover effect both read it to know where "all of
	// them" is — but it is no longer handed to <MapLibre> as a prop, so nothing
	// writes back to it.
	let bounds: LngLatBoundsLike | undefined = $derived(computeBounds());
	const initialBounds = computeBounds();
	const initialZoom = computeZoom(initialBounds);
	const initialCenter = computeCenter(initialBounds);
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
	onload={(m) => (mapInstanceState = m as never)}
	class="h-full"
	standardControls
	style={openStreetMap}
	attributionControl={false}
	bounds={initialBounds}
	zoom={initialZoom}
	center={initialCenter}
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
			<!--
				Marker rather than DefaultMarker: DefaultMarker hands its `class`
				to MapLibre's Marker constructor as `className`, which is applied
				once at creation, so a class that changes on hover never reaches
				the DOM. Owning the element keeps it reactive.
			-->
			<Marker lngLat={latLng.slice().reverse() as [number, number]}>
				<div
					class="marker-pin"
					class:marker-emphasised={highlight && popup?.text === highlight}
					class:marker-dimmed={highlight && popup?.text !== highlight}
					aria-label={tooltip?.text}
				>
					<Fa size="2x" icon={faLocationDot} color={MARKER_COLOUR} />
				</div>
				{#if popup}
					<Popup
						offset={popupOffset(tooltip?.direction)}
						anchor={popupAnchor(tooltip?.direction)}
						openOn={showTooltip ? 'manual' : 'click'}
						open={showTooltip}
					>
						<div class="p-1 m-0 font-bold">{@html popup?.text}</div>
					</Popup>
				{/if}
			</Marker>
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
	/*
	 * The popup card, themed.
	 *
	 * MapLibre paints this white and its tip white to match, and this rule used
	 * to add only `color: #000` — so the card stayed white in dark mode while
	 * Skeleton lightened `.anchor` from primary-700 to primary-500 for the dark
	 * background it assumed was behind it. The link came out at 3.68:1 on the
	 * default theme, under the 4.5:1 AA needs for body text.
	 *
	 * Two decisions, both measured across all ten themes the app ships (the
	 * theme is a per-site cookie, so "fine on wintry" is not fine):
	 *
	 *  - surface-50/900 rather than the 100/800 used for page sections. This is
	 *    a small card floating over map tiles, so it wants the strongest
	 *    separation the palette offers, not the one that blends into a section.
	 *
	 *  - the card's own text is the theme's font-colour pair, which each theme
	 *    guarantees against its own surfaces. The link keeps a primary shade —
	 *    see the rule below for which, and why not `.anchor`'s.
	 *
	 * See features/map-popup-contrast.feature.
	 */
	:global(.maplibregl-popup-content) {
		padding: 0px;
		/* An undeclared background is one a browser feels free to restyle —
		   Chrome's force-dark inverts exactly this kind of surface. Naming both
		   the colour and the scheme leaves nothing to infer. */
		color-scheme: light;
		background-color: rgb(var(--color-surface-50));
		color: rgba(var(--theme-font-color-base));
	}
	:global(.dark .maplibregl-popup-content) {
		color-scheme: dark;
		background-color: rgb(var(--color-surface-900));
		color: rgba(var(--theme-font-color-dark));
	}

	/*
	 * The link keeps its theme's primary, mirrored the way Skeleton mirrors
	 * everything else: a dark shade on the light card, a light shade on the dark
	 * one. `.anchor`'s own primary-700/500 was picked for a page section, not for
	 * this card — on surface-50 it is 2.69:1 at worst (hamlindigo) and fails 6 of
	 * the 10 themes. Two shades further out clears AA on all ten in both modes:
	 * primary-900 on light is 5.48:1 at worst, primary-300 on dark 5.39:1.
	 */
	:global(.maplibregl-popup-content a.anchor) {
		color: rgb(var(--color-primary-900));
	}
	:global(.dark .maplibregl-popup-content a.anchor) {
		color: rgb(var(--color-primary-300));
	}

	/*
	 * Emphasis on hover: the picked marker grows and pulses, the others fade
	 * back. Nothing is removed and the camera does not move — `bounds` comes
	 * from `data`, so dropping the other points would refit the view and the
	 * map would jump under the reader.
	 *
	 * transform-origin is the pin's tip, so it grows out of the point it marks
	 * rather than drifting off it.
	 */
	.marker-pin {
		display: block;
		transform-origin: 50% 100%;
		transition:
			scale 200ms ease-out,
			opacity 200ms ease-out,
			filter 200ms ease-out;
	}

	.marker-emphasised {
		transform-origin: 50% 100%;
		scale: 1.7;
		z-index: 10;
		filter: drop-shadow(0 3px 8px rgb(0 0 0 / 0.5));
		animation: marker-pop 400ms ease-out;
	}

	.marker-dimmed {
		opacity: 0.35;
		filter: saturate(0.4);
	}

	@keyframes marker-pop {
		0% {
			scale: 1;
		}
		55% {
			scale: 2;
		}
		100% {
			scale: 1.7;
		}
	}

	/* Respect a reader who has asked for less motion: keep the size change,
	   drop the pulse. */
	@media (prefers-reduced-motion: reduce) {
		.marker-emphasised {
			animation: none;
		}
	}

	/*
	 * The tip, in dark mode only.
	 *
	 * It is a CSS triangle: MapLibre gives the element four transparent borders
	 * and colours the single edge facing the card, picked per anchor direction.
	 * Setting all four turns the triangle into a filled square, which is what
	 * the first attempt at this did — each edge has to be addressed under the
	 * same direction class MapLibre uses.
	 *
	 * Which edge shows is decided by the *widths*: MapLibre zeroes the border on
	 * the side facing the card and leaves the opposite one at 10px, so for
	 * `anchor-bottom` (popup below its marker) border-bottom is 0 and it is
	 * border-top that is painted. Colouring the zero-width side is a no-op.
	 *
	 * Light mode needs nothing: MapLibre's own white already matches surface-50.
	 */
	:global(.dark .maplibregl-popup-anchor-top .maplibregl-popup-tip),
	:global(.dark .maplibregl-popup-anchor-top-left .maplibregl-popup-tip),
	:global(.dark .maplibregl-popup-anchor-top-right .maplibregl-popup-tip) {
		border-bottom-color: rgb(var(--color-surface-900));
	}
	:global(.dark .maplibregl-popup-anchor-bottom .maplibregl-popup-tip),
	:global(.dark .maplibregl-popup-anchor-bottom-left .maplibregl-popup-tip),
	:global(.dark .maplibregl-popup-anchor-bottom-right .maplibregl-popup-tip) {
		border-top-color: rgb(var(--color-surface-900));
	}
	:global(.dark .maplibregl-popup-anchor-left .maplibregl-popup-tip) {
		border-right-color: rgb(var(--color-surface-900));
	}
	:global(.dark .maplibregl-popup-anchor-right .maplibregl-popup-tip) {
		border-left-color: rgb(var(--color-surface-900));
	}

</style>

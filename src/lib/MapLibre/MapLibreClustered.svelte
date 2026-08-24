<script lang="ts">
	/**
	 * An experiment: the facility map with clustered markers.
	 *
	 * A parallel component to MapLibre.svelte, which is untouched and still what
	 * every real page uses. This exists to see whether clustering is a better
	 * answer to crowding than the per-facility `tooltip_direction` the other
	 * component honours: on the Lyon 3 directory, six pairs of facilities sit
	 * under 100m apart and two share the exact same coordinates.
	 *
	 * The leaves stay HTML markers (MarkerLayer), so a popup keeps its `<a>`
	 * link and the theming pinned by features/map-popup-contrast.feature. Only
	 * the *grouping* is MapLibre's; the cards are still ours.
	 *
	 * The leaves are the same pin MapLibre.svelte draws — a Font Awesome
	 * `faLocationDot` in MapLibre's default blue, anchored so its tip sits on
	 * the point. An earlier version could also draw them as flat dots sized
	 * from the zoom, to test whether the dot or the clustering was doing the
	 * work on a crowded directory. The pins won, so only they remain.
	 *
	 * Two rules govern the reactive code here, both learned the hard way:
	 *
	 *  1. **Nothing derived is handed to <MapLibre> or <GeoJSON> as a prop that
	 *     the library writes back to.** svelte-maplibre declares center/zoom/
	 *     bounds as $bindable and assigns the map's own values to them on every
	 *     `moveend`. A $derived cannot take the write, so it recomputes, returns
	 *     a new object, the library sees a change and moves the camera again:
	 *     effect_update_depth_exceeded. Camera values are computed once, at
	 *     setup, and the map owns them afterwards.
	 *
	 *  2. **Effects stay one statement long and never write what they read.**
	 *     An earlier version had a $derived feeding the GeoJSON that the map
	 *     re-rendered, which re-ran the derivation — the same loop by another
	 *     route. Nothing here writes state the map renders from: hovering only
	 *     changes the `highlight` prop the parent owns.
	 */
	import { untrack } from 'svelte';
	import Fa from 'svelte-fa';
	import { faArrowsToCircle, faLocationDot } from '@fortawesome/free-solid-svg-icons';
	import { bbox } from '@turf/bbox';
	import { featureCollection, point as turfPoint } from '@turf/helpers';
	import {
		MapLibre,
		Control,
		ControlGroup,
		ControlButton,
		GeoJSON,
		MarkerLayer,
		CircleLayer,
		SymbolLayer,
		Popup,
		FillLayer,
		LineLayer
	} from 'svelte-maplibre';
	import type { Map as MapInstance, GeoJSONSource, LngLatBoundsLike } from 'maplibre-gl';
	import type { MapData } from '$lib/interfaces/mapData.interface.js';
	import { openStreetMap } from '$lib/MapLibre/style/openStreetMap';

	let {
		data,
		clusterRadius = 50,
		clusterMaxZoom = 14,
		initialZoom = 13,
		highlight = null,
		geojson = null,
		onfacilityclick = undefined,
		onfacilityhover = undefined,
		openPickedPopup = false,
		onmapbackgroundtap = undefined
	}: {
		data: MapData[];
		/** Points closer than this many pixels are merged. MapLibre's default is 50. */
		clusterRadius?: number;
		/** Above this zoom nothing is clustered — every facility gets its own marker. */
		clusterMaxZoom?: number;
		/** Starting zoom. */
		initialZoom?: number;
		/**
		 * Which point is picked out, for rendering only. The *work* of revealing
		 * a bubble is started by the parent calling showFacility(); this prop
		 * just says which facility is left on the map.
		 */
		highlight?: string | null;
		/** Boundary of the area of interest, drawn under the markers. */
		geojson?: unknown;
		/**
		 * A leaf marker was clicked, identified by the same popup html the
		 * `highlight` prop is matched on.
		 *
		 * The map does not act on this itself — it reports, the parent decides.
		 * Keeping it a callback rather than having the component set its own
		 * `highlight` is what stops the click from becoming a write to the state
		 * the source renders from, which is the loop rule 2 of the header
		 * comment describes. The popup still opens either way: this is
		 * additional to the marker's existing behaviour, not a replacement for
		 * it.
		 */
		onfacilityclick?: (html: string) => void;
		/**
		 * The pointer entered or left a leaf marker, identified the same way.
		 *
		 * `null` on leave. Reported rather than acted on, exactly as
		 * onfacilityclick is: the map says what happened and the parent decides
		 * what it means, so hovering a marker never writes the state the source
		 * renders from.
		 *
		 * Only fires for a pointer that can hover — a finger produces a
		 * synthetic mouseenter on tap, and honouring it would make every tap
		 * behave like a hover on the way to being a click.
		 */
		onfacilityhover?: (html: string | null) => void;
		/**
		 * Open the isolated facility's popup as soon as it is shown, rather than
		 * waiting for a click on its marker.
		 *
		 * For touch, where the popup is the only place the facility's link can
		 * be reached: a finger has no hover, so without this a reader who taps a
		 * button gets an isolated marker and no way to open the page from the
		 * map at all. Only ever applies to the `revealed` marker — the one drawn
		 * alone — so there is never a question of which popup is meant.
		 */
		openPickedPopup?: boolean;
		/**
		 * The map itself was clicked, away from any marker, cluster or popup.
		 *
		 * The "never mind" gesture. The parent cannot detect this on its own:
		 * every click inside the map is a click on the map's canvas, so telling
		 * background from marker means being inside the component, where the
		 * layers are known.
		 */
		onmapbackgroundtap?: () => void;
	} = $props();

	/**
	 * The popup html of a clicked marker, as the parent identifies facilities.
	 *
	 * MarkerLayer hands the click a GeoJSON feature, and `html` is the property
	 * toFeature() carries for exactly this purpose — the same value `highlight`
	 * is compared against, so the parent can match it without knowing anything
	 * about features or indices.
	 */
	function featureHtml(feature: { properties?: Record<string, unknown> | null }) {
		const html = feature?.properties?.html;
		return typeof html === 'string' && html ? html : null;
	}

	function reportClick(feature: { properties?: Record<string, unknown> | null }) {
		const html = featureHtml(feature);
		if (html) onfacilityclick?.(html);
	}

	/**
	 * Ignores a synthetic mouseenter produced by a tap.
	 *
	 * A touch device fires mouseenter bundled with the click, so without this a
	 * tap would report a hover the reader never made — and on the parent's side
	 * that hover would be cleared again a moment later by the matching
	 * mouseleave, leaving the selection flickering.
	 */
	function reportHover(e: MouseEvent, feature: { properties?: Record<string, unknown> | null }) {
		if (window.matchMedia?.('(hover: none)').matches) return;
		onfacilityhover?.(featureHtml(feature));
	}

	function reportHoverEnd() {
		if (window.matchMedia?.('(hover: none)').matches) return;
		onfacilityhover?.(null);
	}

	const SOURCE_ID = 'facilities';


	/**
	 * A pin is drawn from its tip, a dot from its centre.
	 *
	 * `faLocationDot` at 2x is roughly 32px tall, and the glyph's point is at
	 * its bottom edge, so the marker is anchored "bottom" and its popup has to
	 * clear the whole height rather than a radius. The dot keeps the centred
	 * anchor MarkerLayer defaults to.
	 */
	const PIN_ANCHOR = 'bottom' as const;
	const PIN_POPUP_OFFSET: [number, number] = [0, -34];

	/**
	 * A MapData point as the GeoJSON feature the source wants.
	 *
	 * The index is carried as a stable `id`. MarkerLayer keys its DOM markers on
	 * feature identity, and without one a marker from the previous hover could
	 * still be on the map beside the new one — two dots for one hover.
	 */
	const toFeature = (p: MapData, i: number) =>
		// GeoJSON is [lng, lat]; MapData carries [lat, lng].
		turfPoint(
			[p.latLng[1], p.latLng[0]],
			{ html: p.popup?.text ?? '', label: p.tooltip?.text ?? '' },
			{ id: i }
		);

	/**
	 * The frame that holds every facility, via @turf/bbox — the same pair of
	 * helpers MapLibre.svelte uses, rather than a hand-rolled min/max.
	 * Computed once: see rule 1 above.
	 */
	// untrack, and only once: reading `data` reactively here is the whole bug
	// rule 1 describes. The compiler's state_referenced_locally warning is the
	// intended behaviour, so it is silenced rather than worked around.
	const initial = untrack(() => ({
		bounds: data.length
			? (bbox(featureCollection(data.map((p, i) => toFeature(p, i)))) as [number, number, number, number])
			: undefined,
		center: data.length
			? ([data[0].latLng[1], data[0].latLng[0]] as [number, number])
			: undefined
	}));
	const allBounds: LngLatBoundsLike | undefined = initial.bounds;
	const initialCenter = initial.center;

	const FIT_OPTIONS = { padding: 40, duration: 450 };

	let map: MapInstance | null = $state(null);

	/**
	 * Captures the map instance for the controls and showFacility().
	 *
	 * An earlier version also tracked the zoom here, to grow the dot markers as
	 * the map zoomed in. The pins are a fixed size, so nothing reads the zoom
	 * any more and the listener is gone with the dots.
	 */
	function captureMap(m: MapInstance) {
		map = m;
	}

	/**
	 * Called by the parent from its hover handler — not driven by an $effect.
	 *
	 * A user action does not need an effect to observe it: the handler already
	 * knows what happened. Watching the prop with an $effect meant writing the
	 * state the source renders from, which re-ran the effect — the loop this
	 * component fell into three separate times.
	 *
	 * All it does now is reset the frame. Which marker is drawn follows from the
	 * `highlight` prop, so there is no async work and nothing to race: an
	 * earlier version asked getClusterLeaves which facilities shared the bubble,
	 * and a slow answer for a button left long ago could overwrite a newer one.
	 * Showing only the hovered facility makes the question moot.
	 */
	export function showFacility(html: string | null) {
		// The reader may have zoomed since the map loaded, so the facility a
		// button names can be off screen. Reset to the whole set; the marker is
		// then read inside a frame that shows where it sits.
		if (html && map && allBounds) map.fitBounds(allBounds, FIT_OPTIONS);
	}

	/**
	 * While a facility is hovered the map shows **only** that facility.
	 *
	 * Simpler than the alternative, and it is the only version that reads
	 * correctly. Dimming the rest still left the ex-cluster mates on screen at
	 * their own coordinates, so a hover over one facility lit up three dots and
	 * the reader had to work out which was meant. Clearing the map answers the
	 * question the hover asks — *where is this one* — with nothing to mistake it
	 * for.
	 *
	 * `clustered` is the whole set when nothing is hovered; empty otherwise, so
	 * no bubble or leaf survives alongside the picked marker.
	 */
	// Index-keyed rather than filtered into a new list, so a feature keeps the
	// same id across renders and MarkerLayer replaces its marker instead of
	// adding one beside it.
	const clustered = $derived(
		featureCollection(highlight ? [] : data.map((p, i) => toFeature(p, i)))
	);
	/**
	 * The isolated facility — at most **one** marker, never several.
	 *
	 * Facilities are matched on popup html, and a directory can hold two
	 * entries that render the same card: the Lyon 3 data has two "Cabinet
	 * infirmier" at different addresses. Taking every match drew a marker per
	 * entry, and with openPickedPopup those became two popups stacked at
	 * identical coordinates — one visible card, two DOM nodes, and the link
	 * inside it duplicated for anything reading the page.
	 *
	 * `slice(0, 1)` is honest about what isolating can express: the map is being
	 * asked to show "this one", and where the data cannot tell two apart it
	 * shows the first rather than pretending to show both.
	 */
	const broken = $derived(
		featureCollection(
			data
				.map((p, i) => [p, i] as const)
				.filter(([p]) => (p.popup?.text ?? '') === highlight)
				.slice(0, 1)
				// A distinct id space from the clustered features.
				//
				// MarkerLayer keys its DOM markers on feature id, and both
				// sources drew this facility as id `i`. Across the swap from
				// "all facilities" to "just this one" the id repeated, the
				// library treated the new marker as the same one, and the old
				// element was never reclaimed — two identical pins stacked at
				// the same coordinates, and with openPickedPopup two stacked
				// popups. Offsetting the id makes the isolated marker
				// unmistakably a different feature.
				.map(([p, i]) => toFeature(p, i + data.length))
		)
	);

	/** Skeleton's tokens as literal colours — MapLibre paint cannot read CSS vars. */
	const FALLBACK = {
		small: 'rgb(59,130,246)',
		large: 'rgb(29,78,216)'
	};
	let colours = $state({ ...FALLBACK });

	$effect(() => {
		// Reads the DOM, writes `colours`, never reads `colours`: no cycle.
		const read = () => {
			const cs = getComputedStyle(document.body);
			const one = (name: string, fallback: string) => {
				const v = cs.getPropertyValue(name).trim();
				return v ? `rgb(${v.split(/\s+/).join(',')})` : fallback;
			};
			colours = {
				small: one('--color-primary-500', FALLBACK.small),
				large: one('--color-primary-700', FALLBACK.large)
			};
		};
		read();
		const observer = new MutationObserver(read);
		observer.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
		observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
		return () => observer.disconnect();
	});

	/**
	 * Pins wear the same blue as the smallest cluster bubble.
	 *
	 * A bubble is a group of exactly the things a pin stands for, so drawing
	 * them in two unrelated blues — MapLibre's stock #3FB1CE for the pin and
	 * Skeleton's primary for the bubble, which is what this map did at first —
	 * reads as an accident rather than a distinction. Sharing the token also
	 * means the markers follow the site theme, which the hardcoded cyan never
	 * did: the theme is a per-site cookie, so a fixed colour is only ever right
	 * for whichever theme it was picked against.
	 *
	 * `small` rather than `large`: a lone pin is the far end of the same scale a
	 * bubble sits on, and the palette steps darker as the count grows.
	 */
	const pinColour = $derived(colours.small);
</script>

<!--
	`onclick` on the map fires for every click inside it, including ones that
	land on a cluster bubble. The bubbles are a rendered layer, so they are
	found by querying at the click point rather than by checking the DOM — HTML
	markers and popups are separate elements and stop their own events, so they
	never reach here at all.
-->
<MapLibre
	onclick={(e) => {
		if (!onmapbackgroundtap) return;
		const hits = map?.queryRenderedFeatures(e.point, { layers: ['clusters'] }) ?? [];
		if (hits.length) return;
		onmapbackgroundtap();
	}}
	onload={(m) => captureMap(m as never)}
	style={openStreetMap}
	class="h-full w-full"
	bounds={allBounds}
	center={initialCenter}
	zoom={initialZoom}
	fitBoundsOptions={FIT_OPTIONS}
	standardControls
>
	{#if allBounds}
		<Control class="flex flex-col gap-y-3">
			<ControlGroup>
				<ControlButton
					onclick={() => map?.fitBounds(allBounds, FIT_OPTIONS)}
					title="Show every facility"
				>
					<div class="variant-filled"><Fa size="lg" icon={faArrowsToCircle} /></div>
				</ControlButton>
			</ControlGroup>
		</Control>
	{/if}

	{#if geojson}
		<GeoJSON id="boundary" data={geojson as never}>
			<FillLayer paint={{ 'fill-color': '#006600', 'fill-opacity': 0.15 }} beforeLayerType="symbol" />
			<LineLayer
				layout={{ 'line-cap': 'round', 'line-join': 'round' }}
				paint={{ 'line-color': '#003300', 'line-width': 2 }}
				beforeLayerType="symbol"
			/>
		</GeoJSON>
	{/if}

	<GeoJSON
		id={SOURCE_ID}
		data={clustered as never}
		cluster={{ radius: clusterRadius, maxZoom: clusterMaxZoom }}
	>
		<CircleLayer
			id="clusters"
			applyToClusters
			hoverCursor="pointer"
			paint={{
				'circle-color': ['step', ['get', 'point_count'], colours.small, 5, colours.large],
				'circle-radius': ['step', ['get', 'point_count'], 16, 5, 22],
				'circle-stroke-color': '#ffffff',
				'circle-stroke-width': 2,
				'circle-opacity': 1,
				'circle-stroke-opacity': 1
			}}
			onclick={(e) => {
				const clusterId = e.features?.[0]?.properties?.cluster_id;
				const source = e.map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
				if (clusterId == null || !source) return;
				source.getClusterExpansionZoom(clusterId).then((zoom) => {
					const geom = e.features?.[0]?.geometry;
					if (geom?.type === 'Point') {
						e.map.easeTo({ center: geom.coordinates as [number, number], zoom });
					}
				});
			}}
		/>

		<SymbolLayer
			id="cluster-count"
			applyToClusters
			interactive={false}
			layout={{
				'text-field': '{point_count_abbreviated}',
				'text-size': 13,
				'text-font': ['Noto Sans Regular']
			}}
			paint={{ 'text-color': '#ffffff' }}
		/>

		<MarkerLayer
			applyToClusters={false}
			interactive
			asButton
			anchor={PIN_ANCHOR}
			onclick={(e) => reportClick(e.feature)}
		>
			{#snippet children({ feature })}
				<div
					class="marker-pin"
					title={String(feature.properties?.label ?? '')}
					onmouseenter={(e) => reportHover(e, feature)}
					onmouseleave={reportHoverEnd}
					role="presentation"
				>
					<Fa size="2x" icon={faLocationDot} color={pinColour} />
				</div>
				<!--
					`manual` rather than `click` when the parent asks for it:
					with openOn="click" the popup cannot be opened any other way,
					and a touch reader would have no route to the link. `open` is
					read once per marker — the layer holds a single feature, so
					this is that facility's popup and no other.
				-->
				<Popup
					openOn={openPickedPopup ? 'manual' : 'click'}
					open={openPickedPopup}
					offset={PIN_POPUP_OFFSET}
				>
					<div class="p-1 m-0 font-bold">{@html feature.properties?.html ?? ''}</div>
				</Popup>
			{/snippet}
		</MarkerLayer>
	</GeoJSON>

	<!-- The hovered facility, alone on an otherwise empty map. -->
	<GeoJSON id="revealed" data={broken as never}>
		<MarkerLayer interactive asButton anchor={PIN_ANCHOR} onclick={(e) => reportClick(e.feature)}>
			{#snippet children({ feature })}
				<!--
					The picked pin looks exactly like every other pin — same
					colour, same size. It is alone on the map while it is shown,
					so there is nothing for it to be distinguished *from*, and
					recolouring it only asks the reader to interpret a difference
					that carries no meaning. What marks it is movement: it drops
					in, which catches the eye without changing what it is.
				-->
				<div
					class="marker-pin marker-pin-picked"
					title={String(feature.properties?.label ?? '')}
					onmouseenter={(e) => reportHover(e, feature)}
					onmouseleave={reportHoverEnd}
					role="presentation"
				>
					<Fa size="2x" icon={faLocationDot} color={pinColour} />
				</div>
				<!--
					`manual` rather than `click` when the parent asks for it:
					with openOn="click" the popup cannot be opened any other way,
					and a touch reader would have no route to the link. `open` is
					read once per marker — the layer holds a single feature, so
					this is that facility's popup and no other.
				-->
				<Popup
					openOn={openPickedPopup ? 'manual' : 'click'}
					open={openPickedPopup}
					offset={PIN_POPUP_OFFSET}
				>
					<div class="p-1 m-0 font-bold">{@html feature.properties?.html ?? ''}</div>
				</Popup>
			{/snippet}
		</MarkerLayer>
	</GeoJSON>
</MapLibre>

<style lang="postcss">
	/*
	 * The pin. Nothing sizes it — the icon is 2x and fixed, so a marker is the
	 * same 32px whether the map covers a city or a single street.
	 * `line-height: 0` keeps the glyph's box tight to the glyph, so anchoring
	 * "bottom" really does put the tip on the coordinates rather than a few
	 * pixels of leading below it.
	 */
	.marker-pin {
		line-height: 0;
		cursor: pointer;
		/*
		 * A crisp white keyline plus a tight shadow, rather than the soft blur
		 * this had at first.
		 *
		 * A flat glyph dropped on map tiles has nothing separating it from what
		 * is behind it: over a pale street it reads as a smudge, and the wide
		 * blurred shadow made it hazier still rather than lifting it. Three
		 * offset white drop-shadows at zero blur trace the glyph's outline —
		 * the same trick that makes the cluster bubbles legible with their
		 * `circle-stroke-color: #ffffff` — and one short dark shadow underneath
		 * seats it on the map without fogging the edge.
		 */
		filter:
			drop-shadow(1px 0 0 #fff) drop-shadow(-1px 0 0 #fff) drop-shadow(0 1px 0 #fff)
			drop-shadow(0 -1px 0 #fff) drop-shadow(0 2px 2px rgb(0 0 0 / 0.45));
	}

	/*
	 * The picked facility, alone on an otherwise empty map.
	 *
	 * Identical to any other pin at rest — see the markup. The only difference
	 * is the arrival: it drops the last few pixels onto its point and settles.
	 * Motion draws the eye on its own, and unlike a colour change it says
	 * nothing false once it has finished.
	 *
	 * Anchored from the tip, because a pin is held by its point: transforming
	 * about the element's centre would walk the tip off the place it marks.
	 */
	.marker-pin-picked {
		z-index: 10;
		transform-origin: 50% 100%;
		animation: pin-drop 420ms cubic-bezier(0.2, 0.7, 0.3, 1);
	}

	/* Filters do not compose with a parent's, so the outline is restated here
	   rather than inherited — without it the picked pin would lose the keyline
	   the others have. */
	.marker-pin-picked {
		filter:
			drop-shadow(1px 0 0 #fff) drop-shadow(-1px 0 0 #fff) drop-shadow(0 1px 0 #fff)
			drop-shadow(0 -1px 0 #fff) drop-shadow(0 3px 3px rgb(0 0 0 / 0.5));
	}

	@keyframes pin-drop {
		0% { transform: translateY(-30%); opacity: 0; }
		60% { transform: translateY(6%); opacity: 1; }
		100% { transform: translateY(0); opacity: 1; }
	}

	@media (prefers-reduced-motion: reduce) {
		.marker-pin-picked { animation: none; }
	}
</style>

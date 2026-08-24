<script lang="ts">
	import FacilityCarousel from '$lib/Facility/FacilityCarousel.svelte';
	import Map from '$lib/MapLibre/MapLibreClustered.svelte';
	import { createFacilitiesMapData } from '$lib/components/Map/mapData.ts';
	import { scale } from 'svelte/transition';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import * as m from '$msgs';
	import Fa from 'svelte-fa';
	import { faBuilding } from '@fortawesome/free-regular-svg-icons';
	import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
	import { page } from '$app/state';
	import type { Facility } from '$lib/interfaces/facility.interface.js';
	import { base } from '$app/paths';

	// mapAnchor: whether a map marker's popup links to the facility it marks.
	// On by default because this component draws a *list* of facilities — the
	// buttons above the map link each one, and a marker that names a place
	// without reaching it is a dead end. A caller rendering the map on the
	// facility's own page passes false, where the link would point at the page
	// you are already reading.
	// isolateOnSelect: picking a facility leaves only that facility on the map.
	// "Picking" means whatever the reader's input can do — hovering a button
	// with a mouse, tapping one with a finger — so the old `hoverIsolatesMap`
	// name outlived its accuracy and this replaces it.
	//
	// On by default. It was briefly opt-in, which left the behaviour dormant on
	// the home page — the one place it actually matters, where thirteen
	// facilities crowd a small map. A caller that wants a plain map (a single
	// facility's own page, say, where there is nothing to pick between) passes
	// false.
	let {
		data,
		carousel = true,
		geojson = null,
		mapAnchor = true,
		isolateOnSelect = true
	}: {
		data: Facility[];
		carousel?: boolean;
		geojson?: any;
		mapAnchor?: boolean;
		isolateOnSelect?: boolean;
	} = $props();

	/**
	 * The facility currently picked out, and how it was picked.
	 *
	 * `hovered` is the transient one a mouse is resting on; `selected` is the
	 * one a finger has tapped, which survives the finger lifting. They are
	 * separate because they expire differently — a hover ends on mouseleave, a
	 * tap selection ends only when the reader taps elsewhere — but only one is
	 * ever shown at a time, and `picked` below is that one.
	 */
	let hovered: string | null = $state(null);
	let selected: string | null = $state(null);

	/**
	 * Whether `selected` was made by a finger, and so whether its button
	 * carries the "tap again to open" arrow.
	 *
	 * Selection and its affordance are different facts. A mouse can select a
	 * facility too — by clicking its marker — but a click on the button then
	 * navigates directly, so an arrow would advertise a second step that does
	 * not exist for that reader. The ring shows either way.
	 */
	let selectedByTouch = $state(false);

	/**
	 * The facility whose *marker* the pointer is resting on.
	 *
	 * Kept apart from `hovered`, which a button sets, because the two want
	 * different things from the map. Hovering a button isolates: the reader is
	 * reading a list and asking "where is this one". Hovering a marker must
	 * not — isolating would clear every other marker including the one under
	 * the pointer, which destroys the element mid-hover and makes the map
	 * flicker as the pointer is left over nothing. So this marks the button and
	 * leaves the map alone.
	 */
	let markerHovered: string | null = $state(null);

	/**
	 * The map component, for showFacility().
	 *
	 * A selection is only useful if the facility it names is on screen, and the
	 * reader may have panned or zoomed since the map loaded. showFacility()
	 * resets the frame to the whole set, so the isolated marker is read inside a
	 * view that shows where it sits.
	 */
	let mapComponent: { showFacility: (html: string | null) => void } | null = $state(null);

	/**
	 * The facility the map isolates and the button list marks, as its popup
	 * html — the same string the map matches `highlight` on.
	 *
	 * A string rather than the Facility object on purpose. `$state` wraps an
	 * object it stores in a proxy, so the stored facility never `===` the raw
	 * object the {#each} hands the template, and every comparison in the markup
	 * silently failed. Comparing the value the map already identifies facilities
	 * by avoids the question entirely.
	 */
	const picked = $derived(selected ?? hovered ?? markerHovered);

	/**
	 * Whether the current selection should isolate the map.
	 *
	 * False when the selection came from clicking a marker. The clicked marker
	 * is already the thing under the reader's pointer, so isolating would clear
	 * every other marker *including that one* — the source swaps mid-click, the
	 * element is destroyed before its popup can attach, and the click that was
	 * meant to open a card silently opens nothing. Selecting the button is the
	 * whole job in that case; the map stays as it is.
	 */
	let selectionIsolates = $state(true);


	/**
	 * Unique per instance: two <Facility> lists on one page would otherwise
	 * both point aria-describedby at the same DOM id, and a screen reader would
	 * read whichever came first for both.
	 */
	const instanceId = $props.id();
	const facilityHintId = `facility-touch-hint-${instanceId}`;

	// Sorted once rather than inside the {#each}: `data.sort` mutates, and doing
	// that in the template re-sorted the array on every hover.
	const sorted = $derived([...data].sort(compareFn));

	// Every facility stays on the map: the map derives its bounds from the data
	// it is given, so handing it one point would refit the view and the map
	// would jump on hover. The hovered one is emphasised instead.
	const mapPoints = $derived(createFacilitiesMapData(sorted, true, mapAnchor));

	/** The picked facility's popup html, which is how the map matches it. */
	const highlight = $derived.by(() => {
		if (!isolateOnSelect) return null;
		// A marker hover marks the button only — see markerHovered.
		if (selected === null && hovered === null) return null;
		if (selected !== null && !selectionIsolates) return null;
		return picked;
	});


	/**
	 * Picking a facility is a *preview*: cheap, reversible, no commitment.
	 *
	 * A mouse has a gesture for that and touch does not, so on touch the first
	 * tap previews and a second tap on the same button follows the link — the
	 * convention iOS Safari already applies to hover-styled links.
	 *
	 * Simulating a hover on touch does not work, and not only because the state
	 * is missing: mobile browsers do fire a synthetic mouseenter on tap, but
	 * they fire it bundled with the click and send a matching mouseleave right
	 * after, which wipes the preview a moment after it is set. Hence
	 * `touchGesture`: on a touch gesture the mouse handlers stand down entirely
	 * rather than compete.
	 *
	 * Gated on the event's own pointerType rather than a `(hover: none)` media
	 * query. A media query describes the *device*, and a touchscreen laptop
	 * matches `pointer: coarse` while its trackpad is what is being used — that
	 * would cost mouse users their first click for no reason.
	 *
	 * Not $state: read inside event handlers only, never rendered, and it has to
	 * be correct synchronously within one gesture.
	 */
	let touchGesture = false;

	function notePointerType(e: PointerEvent) {
		touchGesture = e.pointerType === 'touch' || e.pointerType === 'pen';
	}

	/** Hover only speaks for a pointer that can actually hover. */
	function onButtonEnter(html: string | null) {
		if (!isolateOnSelect || touchGesture) return;
		hovered = html;
		// A user action calls the map directly rather than setting state for an
		// $effect to notice: the handler already knows what happened, and an
		// effect that reacts to a camera move is how the clustered map kept
		// looping. See the rules in MapLibreClustered's header comment.
		mapComponent?.showFacility(html);
	}

	function onButtonLeave() {
		if (!isolateOnSelect || touchGesture) return;
		hovered = null;
		mapComponent?.showFacility(null);
	}

	/**
	 * Returns without preventing default when the click should navigate.
	 */
	function onButtonClick(e: MouseEvent, html: string | null) {
		// Not opted in, or a mouse/keyboard that already has hover and focus:
		// let the link do what a link does.
		if (!isolateOnSelect || !touchGesture) return;
		// Second tap on the facility already showing: this one means "go".
		if (selected === html) return;
		// First tap: preview it, and stay on this page.
		e.preventDefault();
		selected = html;
		selectedByTouch = true;
		selectionIsolates = true;
		mapComponent?.showFacility(html);
	}

	/**
	 * The map speaking back: a marker was clicked, so select its facility.
	 *
	 * Deliberately writes the same `selected` the tap gesture uses rather than
	 * keeping a second "selected" state — clicking a marker and then tapping
	 * the matching button has to behave like tapping that button twice, and it
	 * does only if both write the same variable.
	 *
	 * The map is not re-isolated from here: the clicked marker is already the
	 * thing under the reader's finger, and clearing the map around it would
	 * remove the context they just used to aim, while refitting the camera out
	 * from under the popup the same click opened.
	 */
	/**
	 * The pointer entered (or left, with null) a marker on the map.
	 *
	 * Marks the matching button so the reader can see which facility it is,
	 * without touching the map — see markerHovered for why isolating here is
	 * wrong. A selection outranks it: once something is selected, a passing
	 * hover should not appear to move the selection.
	 */
	/**
	 * A tap on the map that is not a marker or a popup — the touch reader's
	 * "never mind", and the gesture that gets the full set back. The window
	 * handler deliberately leaves a touch selection alone (see there), so the
	 * map provides the way out.
	 */
	function onMapBackgroundTap() {
		if (!isolateOnSelect || selected === null) return;
		clearSelection();
	}

	function onMarkerHover(html: string | null) {
		if (!isolateOnSelect) return;
		markerHovered = html;
	}

	function onMarkerClick(html: string) {
		selected = html;
		selectedByTouch = touchGesture;
		// See selectionIsolates: the map must not clear the marker just clicked.
		selectionIsolates = false;
	}

	/**
	 * A pointer landing anywhere that is not a facility button or a marker
	 * clears the selection, the way moving a mouse away clears a hover. Without
	 * it a tapped map would stay stuck on one facility, since touch has no
	 * "leave" event.
	 *
	 * Markers and their popups are excluded because a marker click is itself a
	 * pointerdown: without that the selection it sets would be cleared by the
	 * very gesture that set it. Only those, though — a tap on empty map is one
	 * of the most natural ways to say "never mind", and must still clear.
	 */
	function onWindowPointerDown(e: PointerEvent) {
		// Always records the pointer type — the buttons read it even when
		// isolating is off — but only clears a selection that isolating made.
		notePointerType(e);
		if (!isolateOnSelect) return;
		const el = e.target as Element | null;
		if (el?.closest?.('.maplibregl-marker, .maplibregl-popup')) return;
		if (el?.closest?.('[data-facility-button]')) return;
		if (selected === null) return;
		// A touch selection survives a tap elsewhere.
		//
		// On a phone the buttons sit above the map, so acting on a selection
		// means scrolling down to it — and a scroll begins with a pointerdown on
		// whatever happens to be under the thumb. Clearing here made the
		// selection impossible to *use*: it vanished on the way to the thing it
		// had just revealed. A finger keeps its selection until it picks another
		// facility, taps the map's empty space, or taps the selected button
		// again to open the page.
		//
		// A mouse still clears on any click away, which costs nothing: hover
		// re-establishes the preview the moment the pointer returns.
		if (selectedByTouch) return;
		clearSelection();
	}

	/** One place to drop a selection, so every route leaves the same state. */
	function clearSelection() {
		selected = null;
		selectedByTouch = false;
		selectionIsolates = true;
		mapComponent?.showFacility(null);
	}

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

<svelte:window onpointerdown={onWindowPointerDown} />

<div class="grid grid-cols-1 lg:grid-cols-{lgCols} gap-6 lg:gap-10 items-start">
	<div class="lg:col-span-3 text-center">
		<h2 class="h2">{heading}</h2>
	<p>{m.OUR_FACILITIES({ count: data.length })}</p>
	{#if isolateOnSelect && data.length > 1}
		<!--
			Two sentences, one shown per input. A touch reader told to "hover"
			has been handed an instruction they cannot follow, and a mouse reader
			told about taps is being told about a mode they are not in.
			`(hover: hover)` is the right test here, unlike in the event handlers:
			this is a static statement about the device, not a decision about one
			gesture.
		-->
		<p class="text-sm opacity-75 hint-hover">
			{m.FACILITY_MAP_HINT_HOVER()}
		</p>
		<p class="text-sm opacity-75 hint-touch">
			{m.FACILITY_MAP_HINT_TOUCH()}
		</p>
	{/if}
	</div>

	<div class="flex flex-wrap items-center gap-4 text-center">
		{#each sorted as facility, i}
				<a
					href="{base}/sites/{facility.slug||facility.uid}"
					title={facility.name}
					data-facility-button
					class="btn btn-sm w-fit"
					class:variant-ghost-primary={!(isolateOnSelect &&
						picked === mapPoints[i]?.popup?.text)}
					class:variant-filled-primary={isolateOnSelect &&
						picked === mapPoints[i]?.popup?.text}
					class:facility-picked={isolateOnSelect &&
						picked === mapPoints[i]?.popup?.text &&
						selected !== mapPoints[i]?.popup?.text}
					class:facility-selected={isolateOnSelect &&
						selected === mapPoints[i]?.popup?.text}
					aria-describedby={isolateOnSelect &&
					selectedByTouch &&
					selected === mapPoints[i]?.popup?.text
						? facilityHintId
						: undefined}
					onmouseenter={() => onButtonEnter(mapPoints[i]?.popup?.text ?? null)}
					onmouseleave={onButtonLeave}
					onfocus={() => onButtonEnter(mapPoints[i]?.popup?.text ?? null)}
					onblur={onButtonLeave}
					onpointerdown={notePointerType}
					onclick={(e) => onButtonClick(e, mapPoints[i]?.popup?.text ?? null)}
				>
					{facility.label || facility.name}
					<!--
						The second-tap affordance. Only on the one button whose
						behaviour has just changed, and only when a finger made
						the selection — a mouse click navigates directly, so an
						arrow would promise a step that reader does not have.

						aria-hidden because the same thing is said in words by the
						hint element that aria-describedby points at.
					-->
					{#if isolateOnSelect && selectedByTouch && selected === mapPoints[i]?.popup?.text}
						<span class="facility-go" aria-hidden="true">
							<Fa icon={faArrowRight} />
						</span>
					{/if}</a
				>
		{/each}
		{#if data.length > 1}
			<a href="{base}/sites" class="btn variant-ghost-surface" data-sveltekit-preload-data="hover">
				<span><Fa icon={faBuilding} /></span><span>{allLabel}</span>
			</a>
		{/if}
	</div>
	<div in:scale class="h-64 z-0">
		<!--
			showTooltip is gone with the old map: it opened every popup at once,
			which is what made a crowded directory unreadable and what clustering
			replaces. Popups open on click here.
		-->
		<!--
			clusterRadius 22 rather than MapLibre's default 50: the default merged
			facilities that are plainly distinct at this zoom, and 22 was the
			value the /_test/map-cluster comparison settled on for the Lyon 3
			directory, where six pairs sit under 100m apart.
		-->
		<Map
			bind:this={mapComponent}
			data={mapPoints}
			clusterRadius={22}
			{highlight}
			{geojson}
			onfacilityclick={onMarkerClick}
			onfacilityhover={onMarkerHover}
			onmapbackgroundtap={onMapBackgroundTap}
			openPickedPopup={selectedByTouch && selectionIsolates}
		/>
	</div>
	{#if isolateOnSelect}
		<!--
			Named by aria-describedby on the selected button, so a screen reader
			announces what the second tap will do at the moment it becomes true.
			Visually hidden: sighted readers get the same from the ring, the
			arrow, and the map having isolated.
		-->
		<p id={facilityHintId} class="sr-only">
			Showing this facility on the map. Tap again to open its page.
		</p>
	{/if}
	{#if carouselFacilities.length && carousel}
		<div class="place-items-center items-center justify-center content-center">
			<!-- The same list the {#if} above tested, rather than a second filter
			     that could drift out of step with it. -->
			<FacilityCarousel data={carouselFacilities} />
		</div>
	{/if}
</div>

<style lang="postcss">
	/* Default to the touch wording: a device reporting neither (an older
	   browser, a crawler) is better served by the instruction that works with
	   any input, since tapping is what a click does too. */
	.hint-hover { display: none; }
	@media (hover: hover) and (pointer: fine) {
		.hint-hover { display: block; }
		.hint-touch { display: none; }
	}

	/*
	 * The picked button's colours come from Skeleton's `variant-filled-primary`,
	 * applied in the markup — not from here.
	 *
	 * This started as a hand-written pair (primary-700 with light text, mirrored
	 * to primary-400 with dark text under prefers-color-scheme) plus a
	 * doubled-class specificity hack to beat the ghost variant. All of that was
	 * re-implementing what the framework already ships: `variant-filled-primary`
	 * pairs primary-500 with `--on-primary`, a token each *theme* defines as
	 * "text that is legible on primary". Measured on this theme it is 5.71:1,
	 * clear of the 4.5:1 AA needs — and unlike a bespoke pair it follows the
	 * theme, which is a per-site cookie here.
	 *
	 * What stays below is only the part Skeleton has no opinion about: telling a
	 * held selection apart from a passing hover.
	 */

	/*
	 * A selection goes further than a hover.
	 *
	 * Hover is transient and self-evident — the pointer is on it. A selection
	 * persists after the finger lifts and, on touch, has changed what the next
	 * tap does, so it earns a halo that reads as "this one is held", plus the
	 * arrow rendered in the markup.
	 */
	.facility-selected {
		box-shadow: 0 0 0 3px rgb(var(--color-primary-500) / 0.35);
	}

	.facility-go {
		margin-inline-start: 0.4em;
		font-size: 0.8em;
		opacity: 0.85;
		/* Slides once toward the edge it points at, so the eye catches that
		   something about this button just changed. */
		animation: facility-go-nudge 320ms ease-out;
	}

	@keyframes facility-go-nudge {
		0% { transform: translateX(-0.35em); opacity: 0; }
		100% { transform: translateX(0); opacity: 0.85; }
	}

	@media (prefers-reduced-motion: reduce) {
		.facility-go { animation: none; }
	}
</style>

<script lang="ts">
	/**
	 * Clustering experiment, side by side with the map we ship.
	 *
	 * Left: MapLibre.svelte as it is in production — one marker per facility,
	 * every popup open, placed by each facility's `tooltip_direction`.
	 * Right: MapLibreClustered.svelte — the same points through a clustered
	 * GeoJSON source, leaves still HTML markers so the popup keeps its link.
	 *
	 * The seed is the *real* Lyon 3 directory: all thirteen facilities of
	 * /api/v2/public/facilities on dev.santelyon3.fr, copied verbatim. An
	 * earlier version of this page used invented coordinates and understated
	 * the problem badly. The real data crowds like this:
	 *
	 *     0.0m   Cabinet médical      <-> CPTS Lyon 3ème            (identical!)
	 *    34.5m   Laboratoire Gambetta <-> Pharmacie Chedorge
	 *    55.9m   Cabinet infirmier    <-> Cabinet médical / CPTS
	 *    74.9m   Laboratoire Gambetta <-> Cabinet infirmier
	 *    94.6m   Pharmacie Chedorge   <-> Cabinet infirmier
	 *
	 * At zoom 13 those are 0px, 2.6px, 4.2px, 5.6px and 7.1px apart. The first
	 * pair matters most: two facilities at *exactly* the same coordinates cannot
	 * be separated by an anchor direction at all, however it is tuned — that is
	 * the case only clustering answers.
	 *
	 * Dev-only: +page.ts throws 404 outside `dev`.
	 */
	import Facility from '$lib/Facility/Facility.svelte';
	import MapLibreClustered from '$lib/MapLibre/MapLibreClustered.svelte';
	import { createFacilitiesMapData } from '$lib/components/Map/mapData.ts';
	import type { Facility as FacilityType } from '$lib/interfaces/facility.interface.js';
	import { base } from '$app/paths';
	import Fa from 'svelte-fa';
	import { faArrowRight } from '@fortawesome/free-solid-svg-icons';

	let { data }: { data: { facilities: FacilityType[]; geojson: unknown } } = $props();
	const boundary = $derived(data.geojson);

	// Live, from the loader — see +page.ts, which uses the same fetchFacilities
	// and allFacilities the home page does. Nothing is hardcoded here: the
	// previous version pasted the API response in as literals and the slugs
	// went stale the moment dedupe_facility_slugs renamed them.
	const facilities = $derived(data.facilities as FacilityType[]);

	// Sorted the way <Facility> sorts, so the button lists line up with each
	// other and each button matches the point at the same index.
	const sortedFacilities = $derived(
		[...facilities].sort((a, b) => (b.entries?.length ?? 0) - (a.entries?.length ?? 0))
	);
	const points = $derived(createFacilitiesMapData(sortedFacilities, true, true));


	/** Which point the clustered map is picking out, by its popup html. */
	let clusterHighlight: string | null = $state(null);
	let clusteredMap: { showFacility: (html: string | null) => void } | null = $state(null);

	/**
	 * A hover is a user action, so it calls the map directly rather than setting
	 * a prop for an $effect to notice. The prop is still set, but only so the
	 * marker knows which colour to wear.
	 */
	function pick(html: string | null) {
		clusterHighlight = html;
		clusteredMap?.showFacility(html);
	}

	/**
	 * The same feature, for a finger.
	 *
	 * Isolating a facility is a *preview*: cheap, reversible, no commitment.
	 * A mouse has a gesture for that and touch does not, so on touch the first
	 * tap previews and a second tap on the same button commits to the link —
	 * the convention iOS Safari already applies to hover-styled links, and the
	 * one a tap-to-zoom map teaches anyway.
	 *
	 * Simulating a hover event instead does not work, and not only because the
	 * state is missing. Mobile browsers *do* fire a synthetic mouseenter on tap,
	 * but they fire it bundled with the click, and a matching mouseleave lands
	 * immediately after — which is exactly what broke the first attempt here:
	 * the tap set the preview and the synthetic mouseleave wiped it a moment
	 * later, leaving the map untouched. Hence `touchGesture` below: on a touch
	 * gesture the mouse handlers stand down entirely rather than compete.
	 */
	let touchArmed: string | null = $state(null);

	/**
	 * Whether the current selection was made by a finger, and so whether it
	 * carries the "tap again to open" arrow.
	 *
	 * Selection and its *affordance* are two different facts. A large screen
	 * with a mouse can select a button — by clicking its marker — but a click
	 * there navigates directly, so the arrow would advertise a second step the
	 * reader does not have to take. The ring still shows: that is feedback about
	 * what is selected, which is true for every input.
	 */
	let armedByTouch = $state(false);

	/**
	 * True while the gesture in progress came from a finger or a pen.
	 *
	 * Gated on the event's own pointerType rather than a `(hover: none)` media
	 * query. A media query describes the *device*, and a touchscreen laptop
	 * matches `pointer: coarse` while its trackpad is what is actually being
	 * used — that would cost mouse users their first click for no reason. The
	 * event knows which input produced it, so each gesture is judged on its own.
	 *
	 * Not $state: it is read inside event handlers only, never rendered, and it
	 * has to be up to date synchronously within one gesture.
	 */
	let touchGesture = false;

	/**
	 * Records what produced the gesture in progress, for *any* pointerdown on
	 * the page — the buttons and the map alike.
	 *
	 * The buttons could set this from their own handler, but a marker click
	 * happens inside the map component and never reaches one, which would leave
	 * `touchGesture` holding whatever the last button gesture set. Reading it at
	 * the window means every gesture updates it, so a marker click is judged on
	 * its own input rather than on a stale one.
	 */
	function notePointerType(e: PointerEvent) {
		touchGesture = e.pointerType === 'touch' || e.pointerType === 'pen';
	}

	function onFacilityPointerDown(e: PointerEvent) {
		notePointerType(e);
	}

	/** Hover only speaks for a real pointer — see touchGesture. */
	function onFacilityEnter(html: string | null) {
		if (touchGesture) return;
		pick(html);
	}

	function onFacilityLeave() {
		if (touchGesture) return;
		pick(null);
	}

	function onFacilityClick(e: MouseEvent, html: string | null) {
		// A mouse or a keyboard already has hover/focus: let the link work.
		if (!touchGesture) return;
		// Second tap on the button already showing: this one means "go".
		if (touchArmed === html) return;
		// First tap: preview it, and keep this page.
		e.preventDefault();
		touchArmed = html;
		armedByTouch = true;
		pick(html);
	}

	/**
	 * A tap anywhere that is not a facility button clears the preview, the way
	 * moving a mouse away does. Without it the map would stay stuck on one
	 * facility with no way back, since touch has no "leave" event.
	 */
	function clearTouchPreview() {
		if (touchArmed === null) return;
		touchArmed = null;
		armedByTouch = false;
		pick(null);
	}

	/**
	 * The map speaking back: a marker was clicked, so select its button.
	 *
	 * The reverse of the button->map direction above, and deliberately sharing
	 * `touchArmed` with it rather than keeping a second "selected" state. One
	 * selection, whichever end set it: clicking a marker and then tapping the
	 * matching button has to behave like tapping that button twice, and it does
	 * only if both write the same variable.
	 *
	 * On touch this arms the button, so the *button* becomes the navigation
	 * offer — while the popup the click also opened offers the same link
	 * directly. Two routes to the same page is not a conflict here: the popup
	 * is where the finger already is, the button is where the reader's list is.
	 *
	 * The map is not re-isolated from here. The marker that was clicked is
	 * already the thing under the finger, so clearing the map around it would
	 * remove context the reader just used to aim, and calling showFacility()
	 * would refit the camera out from under a popup that has just opened.
	 */
	function onMarkerClick(html: string) {
		// `touchArmed` only — deliberately *not* clusterHighlight, which is what
		// the map isolates on. Isolating here would clear every other marker,
		// including the one the reader just clicked, and the popup that click
		// opened would be left anchored to a marker that no longer exists.
		// Selecting the button is the whole job; the map stays as it is.
		touchArmed = html;
		// A pointer that can hover gets the ring but no arrow: its next click on
		// the button navigates whether or not the button was selected first, so
		// an arrow would promise a second step that does not exist. Only a touch
		// gesture actually changes what the next tap does, and only it is
		// offered the mark that says so. See `armedByTouch` in the markup.
		armedByTouch = touchGesture;
	}
</script>

<!--
	Clears the selection on a pointerdown that is not a facility button and not a
	*marker*.

	Markers are excluded because a marker click is itself a pointerdown, and
	without this the selection it sets would be cleared by the very gesture that
	set it. Only the markers, though, not the whole map: excluding the map
	wholesale — which an earlier version did — meant a tap on empty map no longer
	restored the full set, leaving the reader isolated on one facility with no
	obvious way back. Empty map is one of the most natural places to tap to mean
	"never mind".
-->
<svelte:window
	onpointerdown={(e) => {
		// Recorded for every gesture, including one that lands on the map: a
		// marker click is reported back by the component without a pointer
		// event of its own, so this is where it learns what produced it.
		notePointerType(e);
		const el = e.target as Element | null;
		// .maplibregl-marker is the element MapLibre wraps each HTML marker in,
		// so this catches a dot, a pin and the popup that opens from either.
		if (el?.closest?.('.maplibregl-marker, .maplibregl-popup')) return;
		clearTouchPreview();
	}}
/>

<!--
	The home page's own wrapper, reproduced: a full-bleed <section> whose inner
	`.section-container` is `mx-auto w-full max-w-7xl p-4 py-8`, with the map at
	the h-64 <Facility> gives it. Rendering the map wider or taller than that
	flatters it — the squeeze is partly *because* the box is short and the cards
	are wide.
-->
<div class="pb-10">
	<section>
		<div class="section-container flex-col items-stretch gap-1">
			<h1 class="h2">Facility map: current vs clustered</h1>
			<p class="text-sm opacity-75">
				The real Lyon 3 directory — all {facilities.length} facilities from
				<code>/api/v2/public/facilities</code>. Six pairs sit under 100&nbsp;m apart, and
				<strong>Cabinet médical and CPTS Lyon 3ème share the exact same coordinates</strong>.
			</p>
			<!--
				Two sentences, one shown per input. A touch user reading "hover a
				button" has been handed an instruction they cannot follow, and a
				mouse user reading about taps is being told about a mode they are
				not in. `(hover: hover)` is the right test *here*, unlike in the
				event handlers: this is a static instruction about the device, not
				a decision about one gesture.
			-->
			<p class="text-sm opacity-75 hint-hover">
				<strong>Hover a facility button</strong> below to leave only that facility on the map.
			</p>
			<p class="text-sm opacity-75 hint-touch">
				<strong>Tap a facility button</strong> below to leave only that facility on the map.
				The button is then marked with an arrow — <strong>tap it a second time</strong> to open
				its page. Tap anywhere else to go back to all facilities.
			</p>
			<!--
				Named by aria-describedby on whichever button is currently
				previewed, so a screen reader announces what the second tap will
				do at the moment it becomes true. Visually hidden: sighted touch
				users get the same information from the button's selected state
				plus the isolated map.
			-->
			<p id="touch-preview-hint" class="sr-only">
				Showing this facility on the map. Tap again to open its page.
			</p>
		</div>
	</section>

	<!-- Current, with hover-to-isolate turned on. -->
	<section id="facility" class="bg-surface-100-800-token">
		<div class="section-container flex-col items-stretch">
			<h2 class="h4 mb-2">Current — &lt;Facility&gt;, hover a button to isolate</h2>
			<div id="map-current" class="w-full">
				<Facility data={facilities} carousel={false} geojson={boundary} />
			</div>
		</div>
	</section>

	<!-- Clustered: same container, same h-64 box, and the same button list, so
	     the two are compared on equal terms. -->
	<section class="bg-surface-100-800-token">
		<div class="section-container !flex-col items-stretch">
			<h2 class="h4 mb-2">Clustered — same box and buttons, popups on click</h2>

			<!-- The same two-column disposition <Facility> uses with carousel={false}:
			     buttons on the left, map on the right. -->
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-start w-full">
			<div class="flex flex-wrap items-center gap-4 text-center">
				{#each sortedFacilities as facility, i}
					<a
						href="{base}/sites/{facility.slug || facility.uid}"
						title={facility.name}
						class="btn btn-sm variant-ghost-primary w-fit"
						class:facility-hovered={clusterHighlight === points[i]?.popup?.text &&
							touchArmed !== points[i]?.popup?.text}
						class:facility-armed={touchArmed === points[i]?.popup?.text}
						aria-describedby={armedByTouch && touchArmed === points[i]?.popup?.text
							? 'touch-preview-hint'
							: undefined}
						onmouseenter={() => onFacilityEnter(points[i]?.popup?.text ?? null)}
						onmouseleave={onFacilityLeave}
						onfocus={() => onFacilityEnter(points[i]?.popup?.text ?? null)}
						onblur={onFacilityLeave}
						onpointerdown={(e) => {
							// Stops the window handler below from clearing the
							// preview this same gesture is about to set.
							e.stopPropagation();
							onFacilityPointerDown(e);
						}}
						onclick={(e) => onFacilityClick(e, points[i]?.popup?.text ?? null)}
					>
						{facility.label || facility.name}
						<!--
							The second-tap affordance, and the answer to "how does
							a user know the next tap opens the page?".

							It appears only on the armed button, so it is not
							thirteen arrows competing for attention — it is one
							mark on the one button whose behaviour has just
							changed. Paired with the isolated map (the preview
							already happened, visibly) it reads as the state it is:
							*this one is selected, and here is where it goes*.

							aria-hidden because the same thing is said in words by
							#touch-preview-hint, which aria-describedby points at.
						-->
						{#if armedByTouch && touchArmed === points[i]?.popup?.text}
							<span class="facility-go" aria-hidden="true">
								<Fa icon={faArrowRight} />
							</span>
						{/if}</a
					>
				{/each}
			</div>

			<div id="map-clustered" class="h-64 w-full z-0">
				<MapLibreClustered
					bind:this={clusteredMap}
					data={points}
					initialZoom={13}
					clusterRadius={22}
					highlight={clusterHighlight}
					onfacilityclick={onMarkerClick}
					geojson={boundary}
				/>
			</div>
			</div>
		</div>
	</section>
</div>

<style lang="postcss">
	/* Copied from the home page (src/routes/(skvar)/+page.svelte) so the
	   component is measured at the width it really gets. */
	.section-container {
		@apply mx-auto flex w-full max-w-7xl items-center justify-center p-4 py-8;
	}

	/* Default to the touch wording: a device that reports neither (an older
	   browser, a crawler) is better served by the instruction that works with
	   any input, since tapping is what a click does too. */
	.hint-hover { display: none; }
	@media (hover: hover) and (pointer: fine) {
		.hint-hover { display: block; }
		.hint-touch { display: none; }
	}

	/*
	 * Selected state, by border rather than by fill.
	 *
	 * `variant-filled-primary` was the obvious choice and the wrong one: it
	 * paints the button with the theme's primary and pairs it with primary's
	 * *contrast* text colour, which on the lighter themes lands as dark text on
	 * a mid-tone fill and reads worse than the unselected button next to it.
	 * The state is a preview, not a mode change — it should not cost legibility.
	 *
	 * Keeping `variant-ghost-primary`'s own background and text and moving the
	 * emphasis into the border leaves the label exactly as readable as it was a
	 * moment ago, which is the point: the reader is comparing thirteen of these.
	 */
	/*
	 * Hover and armed are separate conditions, not a priority ladder: a button
	 * shows the hover ring whenever the map is isolated to it, *unless* it is
	 * the armed one, which has its own stronger mark below. An earlier version
	 * suppressed hover whenever anything at all was armed, which was harmless
	 * while only a tap could arm — but a desktop marker click arms too, and it
	 * left every hover on the page unmarked until the reader cleared it.
	 */
	.facility-hovered,
	.facility-armed {
		/* The ghost variant's border is 1px; this is the whole signal, so it is
		   drawn inside the button via box-shadow rather than by growing the
		   border, which would reflow a wrapped row of buttons every hover. */
		box-shadow: inset 0 0 0 2px rgb(var(--color-primary-500));
	}

	/*
	 * The armed (tapped-once) button goes further than the hovered one.
	 *
	 * Hover is transient and self-evident — the pointer is sitting on it. An
	 * armed button persists after the finger has lifted and has *changed what
	 * the next tap does*, so it earns a stronger mark: a full-strength ring
	 * plus the arrow rendered above.
	 */
	.facility-armed {
		box-shadow:
			inset 0 0 0 2px rgb(var(--color-primary-500)),
			0 0 0 3px rgb(var(--color-primary-500) / 0.28);
	}

	/* The arrow sits inside the button, after the label. */
	.facility-go {
		margin-inline-start: 0.4em;
		font-size: 0.8em;
		opacity: 0.85;
		/* Slides once toward the edge it points at, so the eye catches that
		   something about this button just changed. */
		animation: go-nudge 320ms ease-out;
	}

	@keyframes go-nudge {
		0% { transform: translateX(-0.35em); opacity: 0; }
		100% { transform: translateX(0); opacity: 0.85; }
	}

	@media (prefers-reduced-motion: reduce) {
		.facility-go { animation: none; }
	}
</style>

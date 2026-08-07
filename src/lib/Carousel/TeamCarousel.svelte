<script lang="ts">
	import Carousel from 'svelte-light-carousel';
	import { browser } from '$app/environment';
	import Fa from 'svelte-fa';
	import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
	import type { Entry } from '$lib/store/directoryStoreInterface.js';

	let { data }: { data: Entry[] } = $props();

	// The library measures the track when its action attaches, reading
	// `firstChild.clientWidth`. Hydrating a server-rendered carousel measures
	// before the avatars have an intrinsic size, so it concludes there is
	// nothing to scroll and both arrows stay disabled. Rendering client-side
	// only (below) keeps the measurement correct.

	// svelte-light-carousel takes autoPlay in SECONDS (it does `autoPlay * 1000`
	// internally), unlike the old carousel's milliseconds.
	const AUTOPLAY_SECONDS = 5;

	// The slide list itself is reactive, but svelte-light-carousel caches the
	// slide COUNT and geometry in its dragScroll action, recomputing them only on
	// mount and on window resize. When the viewer's role changes the number of
	// avatars (e.g. signing out), that cached count goes stale and the arrows
	// mis-compute the target index — the prev button ends up enabled but inert.
	// Remounting on a count change is the narrowest reliable fix; it does not
	// fire when slide contents change, only when how many there are does.
	const slideCount = $derived(data.length);

	function getLabels(entry: Entry) {
		return entry.effector_type.label;
	}
	function displayName(entry: Entry): string {
		if (entry.name.length > 30 && entry.label) {
			return entry.label;
		}
		return entry.name;
	}
	function getLink(entry: Entry) {
		return `/e/${entry.entrySlug}`;
	}
	function avatarSrc(entry: Entry) {
		return entry.avatar?.lg || entry.avatar?.sm || entry.avatar?.raw;
	}
</script>

<div class="flex justify-center shrink place-content-center content-center mx-auto max-w-full">
	{#if browser}
		<!--
			svelte-light-carousel is SSR-safe on its own: its markup is declarative
			and everything browser-only lives in the `dragScroll` action, which
			Svelte does not run during SSR. Rendering it on the server too means the
			first paint already has the arrows and the correctly sized track, so
			hydration does not resize or shift the slide (see the hydration Rule in
			features/team-carousel.feature).

			The slides prop is reactive, so pictures update on their own when the
			viewer's role changes. The {#key} is only about the library's cached
			slide count (see slideCount above) — without it the arrows go inert
			after the number of avatars changes.

			Layout: a classic three-column row — prev, the slide track, next — laid
			out by the container itself. `order` puts the arrows either side of the
			track (the library renders its snippets after it), and the arrows
			`shrink-0` so only the track flexes. Spacing is the container's single
			responsive `gap` — the slide adds no margin of its own, so prev, slide
			and next are evenly spaced by construction. No absolute positioning and
			no pixel measurements.

			Covered by features/avatar-access.feature and features/team-carousel.feature.
		-->
		{#key slideCount}
		<Carousel
			slides={data}
			key="uid"
			autoPlay={data.length > 1 ? AUTOPLAY_SECONDS : 0}
			pauseOnHover
			containerClass="!flex-row !min-w-0 w-fit items-center justify-center gap-2 sm:gap-4"
			class="!p-0 w-64 shrink-0"
		>
			{#snippet slide({ slide }: { slide: Entry })}
				<figure class="mx-auto w-full max-w-xs text-center">
					<a href={getLink(slide)} class="block">
						<img class="mx-auto h-auto max-w-full" src={avatarSrc(slide)} alt={slide.name} />
					</a>
					<figcaption class="mt-2">
						<a href={getLink(slide)} class="anchor text-primary">
							{displayName(slide)}, {getLabels(slide)}
						</a>
					</figcaption>
				</figure>
			{/snippet}

			<!--
				Arrows are opt-in snippets; nothing renders without them. The library
				renders them after the track, so flex `order` puts prev on the left
				and next on the right without absolute positioning.
			-->
			{#snippet prev({ canScrollPrev, prev, a11y })}
				<button
					type="button"
					class="carousel-arrow order-first"
					onclick={prev}
					disabled={!canScrollPrev}
					{...a11y}
				>
					<Fa icon={faChevronLeft} />
				</button>
			{/snippet}

			{#snippet next({ canScrollNext, next, a11y })}
				<button
					type="button"
					class="carousel-arrow order-last"
					onclick={next}
					disabled={!canScrollNext}
					{...a11y}
				>
					<Fa icon={faChevronRight} />
				</button>
			{/snippet}
		</Carousel>
		{/key}
	{:else}
		{@const entry = data[0]}
		<!--
			Mirrors what the carousel produces, so the avatar is displayed at the
			same size *and in the same place* before and after hydration. Keep the
			two in step.

			Both parts matter. The figure reproduces a slide: a w-64 box (the
			`class` prop above) with the library's own 20px horizontal gap inside.
			The two spacers reproduce the arrows, which are flex siblings of the
			track (see containerClass) and so take real width in the row: without
			them the row is 340px narrower than the hydrated one, and centring it
			puts the avatar 64px to the right of where hydration lands it — a
			visible sideways jump the moment the page becomes interactive.

			Spacers rather than real buttons: there is nothing to scroll before
			hydration, and a disabled button would still be announced. aria-hidden
			keeps them out of the accessibility tree, so they are pure geometry.
		-->
		<div
			class="!flex-row !min-w-0 flex w-fit items-center justify-center gap-2 mx-auto sm:gap-4"
		>
			<div class="carousel-arrow invisible" aria-hidden="true">
				<Fa icon={faChevronLeft} />
			</div>
			<figure class="mx-auto w-64 max-w-full shrink-0 px-5 text-center">
				<a href={getLink(entry)} class="block">
					<img class="mx-auto h-auto max-w-full" src={avatarSrc(entry)} alt={entry.name} />
				</a>
				<figcaption class="mt-2">
					<a href={getLink(entry)} class="anchor text-primary">
						{displayName(entry)}, {getLabels(entry)}
					</a>
				</figcaption>
			</figure>
			<div class="carousel-arrow invisible" aria-hidden="true">
				<Fa icon={faChevronRight} />
			</div>
		</div>
	{/if}
</div>

<style lang="postcss">
	.anchor {
		@apply underline underline-offset-4;
	}
	.carousel-arrow {
		/* Flex sibling of the slide track (see containerClass), so no absolute
		   positioning is needed and the arrows cannot overlap the picture or
		   escape over neighbouring content. */
		@apply shrink-0 rounded-full p-2;
		@apply bg-surface-100-800-token shadow hover:variant-soft-primary;
	}
	.carousel-arrow:disabled {
		@apply cursor-not-allowed opacity-30;
	}
</style>

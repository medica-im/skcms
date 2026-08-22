<script lang="ts">
	import Carousel from 'svelte-light-carousel';
	import { browser } from '$app/environment';
	import CarouselArrow from './CarouselArrow.svelte';
	import type { Entry } from '$lib/store/directoryStoreInterface.js';
	import { base } from '$app/paths';

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
		return `${base}/e/${entry.entrySlug}`;
	}
	function avatarSrc(entry: Entry) {
		// The payload's path is root-relative (/media/...), so it needs the
		// prefix to stay inside this app's namespace rather than landing on
		// whatever serves the site root.
		const path = entry.avatar?.lg || entry.avatar?.sm || entry.avatar?.raw;
		return path ? `${base}${path}` : path;
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

				CarouselArrow owns the styling, and the spacers below render through it
				too so the two cannot drift apart.
			-->
			{#snippet prev({ canScrollPrev, prev, a11y })}
				<CarouselArrow
					direction="prev"
					class="order-first"
					onclick={prev}
					disabled={!canScrollPrev}
					{...a11y}
				/>
			{/snippet}

			{#snippet next({ canScrollNext, next, a11y })}
				<CarouselArrow
					direction="next"
					class="order-last"
					onclick={next}
					disabled={!canScrollNext}
					{...a11y}
				/>
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

			The spacers are the same CarouselArrow the hydrated carousel renders,
			in its `decorative` form — inert and aria-hidden, but identical in
			size by construction rather than by keeping two copies in step.
		-->
		<div
			class="!flex-row !min-w-0 flex w-fit items-center justify-center gap-2 mx-auto sm:gap-4"
		>
			<CarouselArrow direction="prev" decorative />
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
			<CarouselArrow direction="next" decorative />
		</div>
	{/if}
</div>

<style lang="postcss">
	.anchor {
		@apply underline underline-offset-4;
	}
</style>

<script lang="ts">
	import Carousel from 'svelte-light-carousel';
	import { browser } from '$app/environment';
	import CarouselArrow from '$lib/Carousel/CarouselArrow.svelte';
	import { variables } from '$lib/utils/constants';
	import type { Facility } from '$lib/interfaces/facility.interface';
	import { base } from '$app/paths';

	let { data }: { data: Facility[] } = $props();

	// svelte-light-carousel takes autoPlay in SECONDS (it does `autoPlay * 1000`
	// internally), unlike the old carousel's milliseconds.
	const AUTOPLAY_SECONDS = 5;

	// The library caches the slide count and geometry in its dragScroll action,
	// recomputing only on mount and on window resize. Remounting on a count
	// change keeps the arrows from going inert when the list changes size.
	const slideCount = $derived(data.length);

	/** Most-used facilities first, so the busiest address leads the carousel. */
	const slides = $derived([...data].sort((a, b) => b.entries.length - a.entries.length));

	/**
	 * The wide photograph of the place if there is one, else the square avatar.
	 * Mirrors FacilityPage: a facility may carry either, and the newer place
	 * image is the better picture of a building.
	 */
	function pictureSrc(facility: Facility) {
		const place = facility.image?.lg ?? facility.image?.raw;
		if (place) return `${variables.BASE_URI}${place}`;
		return facility.avatar?.raw ?? undefined;
	}

	function pictureAlt(facility: Facility) {
		return facility.image?.alt || facility.name;
	}
</script>

<div class="flex justify-center shrink place-content-center content-center mx-auto max-w-full">
	{#if browser}
		<!--
			Same arrangement as the team carousel: a three-column flex row of prev,
			track and next, laid out by the container. `order` puts the arrows
			either side of the track (the library renders its snippets after it),
			and only the track flexes.

			Rendered client-side only, like the team carousel: the library measures
			the track when its action attaches, and measuring before the pictures
			have an intrinsic size makes it conclude there is nothing to scroll.
		-->
		{#key slideCount}
			<Carousel
				{slides}
				key="uid"
				autoPlay={slides.length > 1 ? AUTOPLAY_SECONDS : 0}
				pauseOnHover
				containerClass="!flex-row !min-w-0 w-fit items-center justify-center gap-2 sm:gap-4"
				class="!p-0 w-64 lg:w-80 shrink-0"
			>
				{#snippet slide({ slide }: { slide: Facility })}
					<figure class="mx-auto w-full text-center">
						<a href="{base}/sites/{slide.slug}" class="block">
							<img
								class="mx-auto h-auto max-w-full"
								src={pictureSrc(slide)}
								alt={pictureAlt(slide)}
							/>
						</a>
						<figcaption class="mt-2">
							<a href="{base}/sites/{slide.slug}" class="anchor text-primary">
								{slide.name}
							</a>
						</figcaption>
					</figure>
				{/snippet}

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
		{@const facility = slides[0]}
		<!--
			Mirrors what the carousel produces for a slide, so the picture is the
			same size before and after hydration. Keep the two in step.
		-->
		<figure class="mx-auto w-64 lg:w-80 max-w-full px-5 text-center">
			<a href="{base}/sites/{facility.slug}" class="block">
				<img class="mx-auto h-auto max-w-full" src={pictureSrc(facility)} alt={pictureAlt(facility)} />
			</a>
			<figcaption class="mt-2">
				<a href="{base}/sites/{facility.slug}" class="anchor text-primary">
					{facility.name}
				</a>
			</figcaption>
		</figure>
	{/if}
</div>

<style lang="postcss">
	.anchor {
		@apply underline underline-offset-4;
	}
</style>

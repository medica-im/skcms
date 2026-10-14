<script lang="ts">
	import Carousel from 'svelte-light-carousel';
	import { browser } from '$app/environment';
	import CarouselArrow from './CarouselArrow.svelte';

	let { images, alt }: { images: string[]; alt: string } = $props();

	// svelte-light-carousel takes autoPlay in seconds.
	const AUTOPLAY_SECONDS = 5;

	const slides = $derived(images.map((src) => ({ src })));
</script>

<div class="flex justify-center shrink place-content-center content-center mx-auto max-w-full">
	{#if browser}
		<!--
			Client-side only, like the team and facility carousels: the library
			measures the track when its action attaches, before the pictures have
			an intrinsic size on a hydrated page.
		-->
		{#key slides.length}
			<Carousel
				{slides}
				key="src"
				autoPlay={slides.length > 1 ? AUTOPLAY_SECONDS : 0}
				pauseOnHover
				containerClass="!flex-row !min-w-0 w-fit items-center justify-center gap-2 sm:gap-4"
				class="!p-0 w-72 sm:w-96 shrink-0"
			>
				{#snippet slide({ slide }: { slide: { src: string } })}
					<img class="mx-auto h-auto max-w-full rounded-container-token" src={slide.src} {alt} />
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
	{:else if images.length}
		<!-- What the carousel shows first, at the same size. Keep the two in step. -->
		<img class="mx-auto w-72 sm:w-96 h-auto max-w-full rounded-container-token" src={images[0]} {alt} />
	{/if}
</div>

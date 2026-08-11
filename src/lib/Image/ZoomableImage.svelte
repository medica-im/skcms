<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import BiggerPicture from 'bigger-picture';
	import 'bigger-picture/css';
	import * as m from '$msgs';

	/**
	 * An image that opens full screen, zoomable, when tapped or clicked.
	 *
	 * The viewer is bigger-picture, not something written here: it brings
	 * pinch-to-zoom on touch, wheel and click zoom to native resolution, swipe to
	 * dismiss, focus handling and the whole overlay, in about 10KB. A hand-rolled
	 * <dialog> can show an image full screen but cannot pinch-zoom, which is the
	 * thing people actually want from a photograph on a phone.
	 *
	 * Wrapped in a component of our own so call sites read like an <img> and so
	 * the choice of library lives in one file. The same viewer takes an array of
	 * one or of many, so a gallery later needs no second component and no
	 * migration.
	 *
	 *     <ZoomableImage src={photo} alt="…" class="w-full h-64 object-cover" />
	 */
	let {
		src,
		alt,
		class: className = '',
		/** Shown under the enlarged image. */
		caption = '',
		/** Natural size, so the viewer can scale without guessing or reflowing. */
		width,
		height
	}: {
		src: string;
		alt: string;
		class?: string;
		caption?: string;
		width?: number;
		height?: number;
	} = $props();

	let bp: ReturnType<typeof BiggerPicture> | undefined;
	let trigger: HTMLButtonElement | undefined = $state();

	onMount(() => {
		// After the DOM exists: bigger-picture mounts its overlay into a target.
		bp = BiggerPicture({ target: document.body });
	});

	onDestroy(() => bp?.close?.());

	function open() {
		bp?.open({
			items: [{ img: src, alt, caption, width, height }],
			// Animates the overlay out of the thumbnail rather than fading in from
			// nowhere, so it is clear which image was opened.
			el: trigger
		});
	}
</script>

<!--
	A button, so the image is focusable, reachable by keyboard and announced as
	something that acts. `contents` keeps the wrapper out of the layout: the
	image keeps whatever classes the caller gave it.
-->
<button
	bind:this={trigger}
	type="button"
	class="contents cursor-zoom-in"
	onclick={open}
	title={m.IMAGE_ZOOM()}
	aria-label={m.IMAGE_ZOOM()}
>
	<img {src} {alt} class={className} />
</button>

<!--
	bigger-picture ships no backdrop of its own — .bp-wrap is transparent, so the
	page reads straight through the overlay and the photograph competes with a
	map and a footer behind it. The dimming is ours to provide.

	:global because the overlay is mounted on <body>, outside this component's
	scope, so a scoped selector would never reach it.
-->
<style>
	:global(.bp-wrap) {
		background: rgb(0 0 0 / 0.85);
	}
</style>

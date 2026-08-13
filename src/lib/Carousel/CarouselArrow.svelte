<script lang="ts">
	import Fa from 'svelte-fa';
	import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';

	// The prev/next control shared by every carousel, and the invisible spacer
	// that reserves its width before hydration. Both shapes live here because
	// the spacer's only job is to occupy exactly as much room as the real
	// button: when the two were styled by a copy-pasted class they could drift
	// apart silently, and a mismatch shifts the slide sideways the moment the
	// page becomes interactive.
	let {
		direction,
		onclick,
		disabled = false,
		decorative = false,
		class: className = '',
		...rest
	}: {
		direction: 'prev' | 'next';
		onclick?: () => void;
		disabled?: boolean;
		/** Render as an inert, aria-hidden spacer instead of a button. */
		decorative?: boolean;
		class?: string;
		[key: string]: unknown;
	} = $props();

	const icon = $derived(direction === 'prev' ? faChevronLeft : faChevronRight);
</script>

{#if decorative}
	<!--
		A spacer, not a disabled button: before hydration there is nothing to
		scroll, and a disabled button would still be announced. aria-hidden keeps
		it out of the accessibility tree, so it is pure geometry. `invisible`
		drops the paint while keeping the box.
	-->
	<div class="carousel-arrow invisible {className}" aria-hidden="true">
		<Fa {icon} />
	</div>
{:else}
	<button type="button" class="carousel-arrow {className}" {onclick} {disabled} {...rest}>
		<Fa {icon} />
	</button>
{/if}

<style lang="postcss">
	/* :global is required, not stylistic. The `-token` utilities below expand to
	   a `.dark &` variant, and `.dark` sits on <html> — outside this component.
	   Svelte's scoper prunes selectors whose ancestor part it cannot match here,
	   so a plain `.carousel-arrow` silently drops every dark-mode rule and the
	   arrow renders with light-mode colours on a dark page. Scoping is not lost:
	   the class is defined and used only in this file. */
	:global(.carousel-arrow) {
		/* Flex sibling of the slide track (see each carousel's containerClass), so
		   no absolute positioning is needed and the arrows cannot overlap the
		   picture or escape over neighbouring content. */
		@apply shrink-0 rounded-full p-2;
		/* The foreground token is not optional: without it the chevron inherits
		   body text, which in dark mode is light grey on a surface-800 chip that
		   is itself close to the page background — the arrow all but disappears.
		   Pairing bg with its matching text token, plus a border to detach the
		   chip from the page, keeps it legible in both themes. */
		@apply border border-surface-300-600-token bg-surface-100-800-token text-surface-900-50-token;
		@apply shadow;
	}
	/* Only real pointers get the hover state. A touch device has no pointer to
	   move away, so an unguarded `hover:` latches after a tap and the arrow stays
	   highlighted until something else is touched. */
	@media (hover: hover) {
		:global(.carousel-arrow:hover:not(:disabled)) {
			@apply variant-soft-primary;
		}
	}
	:global(.carousel-arrow:disabled) {
		@apply cursor-not-allowed opacity-30;
	}
</style>

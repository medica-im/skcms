<script lang="ts">
	/**
	 * How many entries a selector button reaches: a disc at the button's top right,
	 * read aloud as « (n) » after the label. The button must be `relative` and leave
	 * room on its right for the disc. At 0 there is no disc: a blue disc reads as
	 * « something here », and the faded button already says there is nothing.
	 */
	let { count }: { count: number } = $props();
</script>

<span class="sr-only">({count})</span>
{#if count > 0}
	<span
		class="badge-icon variant-filled-primary absolute -top-1.5 -right-1.5 h-5 w-auto min-w-5 px-1 text-base leading-none"
		aria-hidden="true">{count}</span
	>
{/if}

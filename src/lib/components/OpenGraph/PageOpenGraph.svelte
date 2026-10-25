<script lang="ts">
	import { page } from '$app/state';
	import OpenGraph from './OpenGraph.svelte';
	import { mergeCard } from './mergeCard';

	const card = $derived(mergeCard(page.data.openGraph, page.data.card));
	const siteName = $derived(page.data.organization?.formatted_name);
</script>

{#if card}
	<OpenGraph opengraph={card} />
	{#if siteName}
		<meta property="og:site_name" content={siteName} />
	{/if}
{/if}

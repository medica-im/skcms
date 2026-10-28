<script lang="ts">
	import { page } from '$app/state';
	import OpenGraph from './OpenGraph.svelte';
	import { mergeCard } from './mergeCard';
	import { getLocale } from '$prgld/runtime.js';

	const ogLocales: Record<string, string> = { fr: 'fr_FR', en: 'en_US' };

	const card = $derived(mergeCard(page.data.openGraph, page.data.card));
	const siteName = $derived(page.data.organization?.formatted_name);
	const ogLocale = $derived(ogLocales[getLocale()]);
</script>

{#if card}
	<OpenGraph opengraph={card} />
	{#if siteName}
		<meta property="og:site_name" content={siteName} />
	{/if}
	{#if ogLocale}
		<meta property="og:locale" content={ogLocale} />
	{/if}
{/if}

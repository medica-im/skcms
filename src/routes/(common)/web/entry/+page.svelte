<script lang="ts">
	import { page } from '$app/state';
	import CreateEntry from '$lib/Web/CreateEntry.svelte';
	import { browser } from '$app/environment';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>
<svelte:head>
	<title>
		Créer une entrée - {capitalizeFirstLetter(page.data.organization.formatted_name)}
	</title>
</svelte:head>

<!--
	No background of its own: Wintry already paints a gradient at the top of the
	viewport, and a band repeating those colours in its own box drew them twice
	at two scales, leaving a seam where it ended.
-->
<header id="hero">
	<div class="mx-0 flex flex-col items-center justify-center p-4 py-6 space-y-2">
		<h2 class="h2">Créer une entrée</h2>
		{#if browser && data.user}
			<CreateEntry user={data.user} effectors={data.effectors} />
		{/if}
	</div>
</header>

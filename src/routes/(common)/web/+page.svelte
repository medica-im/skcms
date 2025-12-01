<script lang="ts">
	import { page } from '$app/state';
	import CreateEntry from '$lib/Web/CreateEntry.svelte';
	import { browser } from '$app/environment';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
</script>
<svelte:head>
	<title>
		Créer une entrée - {capitalizeFirstLetter(page.data.organization.formatted_name)}
	</title>
</svelte:head>

<header id="hero" class="bg-surface-100-800-token hero-gradient">
	<div class="mx-0 flex flex-col items-center justify-center p-4 py-6 space-y-2">
		<h2 class="h2">Créer une entrée</h2>
		{#if browser}
			<CreateEntry />
		{/if}
	</div>
</header>

<section id="team" class="bg-surface-100-800-token team-gradient">
	<div class="section-container"></div>
</section>

<style lang="postcss">
	.section-container {
		@apply mx-auto flex w-full max-w-7xl items-center justify-center p-4 py-8;
	}
	/* Hero Gradient */
	/* prettier-ignore */
	.hero-gradient {
		background-image:
			radial-gradient(at 0% 0%, rgba(var(--color-secondary-500) / 0.33) 0px, transparent 50%),
			radial-gradient(at 98% 1%, rgba(var(--color-error-500) / 0.33) 0px, transparent 50%);
	}
</style>

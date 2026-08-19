<script lang="ts">
	import { variables } from '$src/lib/utils/constants';
	import { page } from '$app/state';
	import * as m from '$msgs';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import EntriesTable from '$lib/Web/Entries/EntriesTable.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// The endpoint refuses anyone below administrator, so this only decides
	// what the page says — it is not the access control. A viewer who reaches
	// here without the role gets the refusal below rather than an empty table,
	// which would read as an empty directory.
	const isAuthorized = $derived(
		page.data?.user?.role === 'superuser' || page.data?.user?.role === 'administrator'
	);
</script>

<svelte:head>
	<title>
		{m.admin_entries_title()} - {capitalizeFirstLetter(
			page.data.organization.formatted_name,
			variables.DEFAULT_LANGUAGE
		)}
	</title>
</svelte:head>

<header id="hero" class="hero-gradient">
	<div class="flex flex-col items-center p-4 py-6 space-y-2">
		<h2 class="h2">{m.admin_entries_title()}</h2>
		<p class="opacity-70 text-sm">{m.admin_entries_subtitle()}</p>
	</div>
</header>

<div class="section-container">
	{#if !isAuthorized}
		<aside class="alert variant-ghost-error">
			<div class="alert-message"><p>403</p></div>
		</aside>
	{:else if data.entries === undefined}
		<!-- The loader logged the reason; an empty table here would be a lie. -->
		<aside class="alert variant-ghost-warning">
			<div class="alert-message"><p>{m.admin_entries_none()}</p></div>
		</aside>
	{:else}
		<EntriesTable entries={data.entries} />
	{/if}
</div>

<style lang="postcss">
	.section-container {
		@apply mx-auto w-full max-w-7xl p-4 py-8 md:py-10;
	}
	/* prettier-ignore */
	.hero-gradient {
		background-image:
			radial-gradient(at 0% 0%, rgba(var(--color-secondary-500) / 0.33) 0px, transparent 50%),
			radial-gradient(at 98% 1%, rgba(var(--color-error-500) / 0.33) 0px, transparent 50%);
	}
</style>

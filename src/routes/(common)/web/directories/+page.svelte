<script lang="ts">
	import { page } from '$app/state';
	import * as m from '$msgs';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import DirectorySettingsRow from '$lib/Web/Directory/DirectorySettingsRow.svelte';
	import { getDirectorySettings } from '../../../../directory.remote';

	/** This site's directories and their settings — superusers only. */
	const directories = $derived(await getDirectorySettings());
</script>

<svelte:head>
	<title>
		{m.DIRECTORIES_TITLE()} - {capitalizeFirstLetter(page.data.organization?.formatted_name ?? '')}
	</title>
</svelte:head>

<div class="mx-auto w-full max-w-4xl space-y-6 p-4 py-4 md:py-8">
	<header class="space-y-2">
		<h1 class="h2">{m.DIRECTORIES_TITLE()}</h1>
		<p class="text-surface-600-300-token">{m.DIRECTORIES_INTRO()}</p>
	</header>

	{#if directories === null}
		<p class="text-error-700-200-token" data-testid="directories-load-failed">{m.DIRECTORIES_LOAD_FAILED()}</p>
	{:else if directories.length === 0}
		<p class="text-surface-600-300-token">{m.DIRECTORIES_EMPTY()}</p>
	{:else}
		<ul class="space-y-4">
			{#each directories as directory (directory.uid)}
				<DirectorySettingsRow {directory} />
			{/each}
		</ul>
	{/if}
</div>

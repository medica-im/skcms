<script lang="ts">
	import { page } from '$app/state';
	import { SlideToggle } from '@skeletonlabs/skeleton';
	import * as m from '$msgs';
	import EffectorTypeSelect from '$lib/Web/EffectorTypeSelect.svelte';

	/**
	 * The category picker for an entry being created or changed: the categories
	 * this site's directory offers (every one when it names none). A superuser
	 * may use any category — the backend lets them — so they get a switch to
	 * show them all; everyone else is held to the directory's.
	 */
	let {
		selectedEffectorType = $bindable()
	}: { selectedEffectorType: { label: string; value: string } | undefined } = $props();

	const isSuperuser = $derived(page.data?.user?.role === 'superuser');
	let showAll = $state(false);
</script>

<div class="w-full space-y-2">
	<EffectorTypeSelect bind:selectedEffectorType scope={isSuperuser && showAll ? 'all' : 'directory'} />
	{#if isSuperuser}
		<SlideToggle
			name="effector-types-show-all"
			label={m.ENTRY_TYPES_SHOW_ALL()}
			bind:checked={showAll}
			size="sm"
			background="bg-surface-300 dark:bg-surface-600"
			active="bg-primary-500"
		>
			<span class="inline-flex min-h-11 items-center text-sm">{m.ENTRY_TYPES_SHOW_ALL()}</span>
		</SlideToggle>
	{/if}
</div>

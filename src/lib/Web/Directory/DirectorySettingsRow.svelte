<script lang="ts">
	import { untrack } from 'svelte';
	import { invalidate } from '$app/navigation';
	import { SlideToggle } from '@skeletonlabs/skeleton';
	import Fa from 'svelte-fa';
	import { faCheck } from '@fortawesome/free-solid-svg-icons';
	import * as m from '$msgs';
	import type { DirectorySettings } from '$lib/interfaces/v2/directory.ts';
	import { setListOwnerEntry, type DirectoryUpdateResult } from '../../../directory.remote';

	let { directory }: { directory: DirectorySettings } = $props();

	// Local so a refused change can be put back: the toggle flips on click,
	// before the server has answered.
	let checked = $state(untrack(() => directory.list_owner_entry));
	let saving = $state(false);
	let result = $state<DirectoryUpdateResult | undefined>();
	// Disabled until hydrated: a click on the server-rendered checkbox flips
	// it natively, hydration then adopts the DOM value through bind:checked,
	// and no change event ever reaches save() — shown changed, never saved.
	let hydrated = $state(false);
	$effect(() => {
		hydrated = true;
	});

	async function save() {
		const wanted = checked;
		saving = true;
		result = undefined;
		try {
			result = await setListOwnerEntry({ uid: directory.uid, list_owner_entry: wanted });
			if (!result.success) {
				checked = !wanted;
			} else {
				// The root layout loads the entries once and client-side
				// navigation keeps them: without this the address book still
				// shows the old list until a full reload. Same pair as clone.
				await Promise.all([invalidate('app:entries'), invalidate('app:facilities')]);
			}
		} catch (e) {
			console.error('setListOwnerEntry failed', e);
			checked = !wanted;
			result = { success: false, status: 0 };
		} finally {
			saving = false;
		}
	}
</script>

<li class="card p-4 space-y-2" data-testid="directory-row" data-directory={directory.name}>
	<div>
		<h2 class="h4">{directory.display_name ?? directory.name}</h2>
		<p class="text-sm text-surface-600-300-token">
			<code class="code">{directory.name}</code>
			{#if directory.owner}
				· {m.DIRECTORIES_OWNER({ label: directory.owner.label ?? directory.owner.uid })}
			{/if}
		</p>
	</div>
	<div class="flex items-center gap-2">
		<SlideToggle
			name="list-owner-entry-{directory.uid}"
			bind:checked
			on:change={save}
			disabled={!hydrated || saving || !directory.owner}
			background="bg-surface-300 dark:bg-surface-600"
			active="bg-primary-500"
		>
			<span class="inline-flex min-h-11 items-center">{m.DIRECTORIES_LIST_OWNER_ENTRY()}</span>
		</SlideToggle>
		{#if result?.success}
			<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
		{/if}
	</div>
	{#if !directory.owner}
		<p class="text-sm text-surface-600-300-token">{m.DIRECTORIES_NO_OWNER()}</p>
	{/if}
	{#if result && !result.success}
		<p class="text-sm text-error-700-200-token" role="alert">{m.DIRECTORIES_SAVE_FAILED()}</p>
	{/if}
</li>

<script lang="ts">
	import { untrack } from 'svelte';
	import Fa from 'svelte-fa';
	import { faPen, faTriangleExclamation, faXmark } from '@fortawesome/free-solid-svg-icons';
	import * as m from '$msgs';
	import Dialog from '$lib/Web/Dialog.svelte';
	import EffectorTypeSelect from '$lib/Web/EffectorTypeSelect.svelte';
	import type { DirectorySettings } from '$lib/interfaces/v2/directory.ts';
	import {
		offerEffectorType,
		withdrawEffectorType,
		withdrawAllEffectorTypes,
		type DirectoryUpdateResult
	} from '../../../directory.remote';

	/**
	 * The categories a directory offers at entry creation.
	 *
	 * The page shows them; editing happens in an overlay, because controls
	 * among the directory's other settings read as part of those. None listed:
	 * every category is offered, the default — what "remove all" returns to,
	 * so that one asks first. Each action saves at once; the list, here and on
	 * the page, is the server's answer.
	 */
	let { directory }: { directory: DirectorySettings } = $props();

	let types = $state(untrack(() => directory.effector_types));
	let selected: { label: string; value: string } | undefined = $state();
	let saving = $state(false);
	let confirmingClear = $state(false);
	let result = $state<DirectoryUpdateResult | undefined>();
	let dialog: HTMLDialogElement | undefined = $state();
	// Disabled until hydrated, like the owner switch beside it: a click on the
	// server-rendered button would otherwise do nothing.
	let hydrated = $state(false);
	$effect(() => {
		hydrated = true;
	});

	const label = (type: { uid: string; label: string | null }) => type.label ?? type.uid;

	function open() {
		result = undefined;
		confirmingClear = false;
		dialog?.showModal();
	}

	async function save(change: () => Promise<DirectoryUpdateResult>) {
		saving = true;
		result = undefined;
		try {
			result = await change();
			if (result.success && result.directory) {
				types = result.directory.effector_types;
			}
		} catch (e) {
			console.error('Changing the offered categories failed', e);
			result = { success: false, status: 0 };
		} finally {
			saving = false;
		}
	}

	async function add() {
		if (!selected) return;
		const effector_type = selected.value;
		await save(() => offerEffectorType({ uid: directory.uid, effector_type }));
		if (result?.success) selected = undefined;
	}

	async function clear() {
		confirmingClear = false;
		await save(() => withdrawAllEffectorTypes({ uid: directory.uid }));
	}
</script>

<section class="space-y-2" data-testid="directory-types">
	<h3 class="h5">{m.DIRECTORY_TYPES_TITLE()}</h3>
	{#if types.length}
		<p class="text-sm text-surface-600-300-token">{m.DIRECTORY_TYPES_HELP()}</p>
		<ul class="flex flex-wrap gap-2" data-testid="directory-types-summary">
			{#each types as type (type.uid)}
				<li class="rounded-container-token variant-soft-primary px-3 py-1 text-sm">{label(type)}</li>
			{/each}
		</ul>
	{:else}
		<p class="text-sm text-surface-600-300-token" data-testid="directory-types-all">{m.DIRECTORY_TYPES_ALL()}</p>
	{/if}
	<button type="button" class="btn variant-ghost-primary min-h-11" disabled={!hydrated} onclick={open}>
		<Fa icon={faPen} />
		<span>{m.DIRECTORY_TYPES_EDIT()}</span>
	</button>
</section>

<Dialog bind:dialog classProp="w-[90vw] sm:w-[32rem]">
	<div class="p-4 sm:p-6 space-y-4" data-testid="directory-types-dialog">
		<header>
			<h2 class="h3">{m.DIRECTORY_TYPES_TITLE()}</h2>
			<p class="text-sm text-surface-600-300-token">{directory.display_name ?? directory.name}</p>
		</header>

		{#if types.length}
			<p class="text-sm">{m.DIRECTORY_TYPES_HELP()}</p>
			<ul class="flex flex-wrap gap-2">
				{#each types as type (type.uid)}
					<li class="flex items-center gap-1 rounded-container-token variant-soft-primary pl-3">
						<span>{label(type)}</span>
						<button
							type="button"
							class="btn-icon min-h-11 min-w-11"
							aria-label={m.DIRECTORY_TYPES_REMOVE({ label: label(type) })}
							title={m.DIRECTORY_TYPES_REMOVE({ label: label(type) })}
							disabled={saving}
							onclick={() => save(() => withdrawEffectorType({ uid: directory.uid, effector_type: type.uid }))}
						><Fa icon={faXmark} /></button>
					</li>
				{/each}
			</ul>
			<!-- Next to the list it empties, not in the footer: on a phone the
			     footer wrapped it and "Fermer" onto two ragged rows. -->
			{#if confirmingClear}
				<div class="card variant-soft-warning p-3 space-y-3">
					<div class="flex items-start gap-2">
						<Fa icon={faTriangleExclamation} class="mt-1 shrink-0" />
						<p>{m.DIRECTORY_TYPES_REMOVE_ALL_CONFIRM()}</p>
					</div>
					<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
						<button
							type="button"
							class="btn variant-ghost-surface min-h-11 w-full sm:w-auto"
							data-testid="directory-types-clear-cancel"
							onclick={() => (confirmingClear = false)}
						>{m.CANCEL()}</button>
						<button
							type="button"
							class="btn variant-filled-warning min-h-11 w-full sm:w-auto"
							data-testid="directory-types-clear-confirm"
							disabled={saving}
							onclick={clear}
						>{m.DIRECTORY_TYPES_REMOVE_ALL()}</button>
					</div>
				</div>
			{:else}
				<button
					type="button"
					class="btn variant-ghost-error min-h-11"
					disabled={saving}
					onclick={() => (confirmingClear = true)}
				>{m.DIRECTORY_TYPES_REMOVE_ALL()}</button>
			{/if}
		{:else}
			<p class="text-sm">{m.DIRECTORY_TYPES_ALL()}</p>
		{/if}

		<div class="flex flex-col gap-2 sm:flex-row sm:items-center">
			<div class="w-full sm:flex-1">
				<EffectorTypeSelect bind:selectedEffectorType={selected} exclude={types.map((t) => t.uid)} />
			</div>
			<button type="button" class="btn variant-filled-primary min-h-11" disabled={saving || !selected} onclick={add}>
				{m.DIRECTORY_TYPES_ADD()}
			</button>
		</div>

		{#if result && !result.success}
			<p class="text-sm text-error-700-200-token" role="alert">{m.DIRECTORIES_SAVE_FAILED()}</p>
		{/if}

		<footer class="flex justify-end">
			<button type="button" class="btn variant-ghost-surface min-h-11" onclick={() => dialog?.close()}>
				{m.CLOSE()}
			</button>
		</footer>
	</div>
</Dialog>

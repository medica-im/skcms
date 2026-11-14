<script lang="ts">
	/**
	 * An entry's description, at the top of its page, and the dialog that edits it.
	 *
	 * Saved through the entry's PATCH, whose permission (owner or creator,
	 * administrators, superusers) is the backend's; an emptied text removes it.
	 */
	import Fa from 'svelte-fa';
	import { faCheck, faPenToSquare } from '@fortawesome/free-solid-svg-icons';
	import { faFileLines } from '@fortawesome/free-regular-svg-icons';
	import { invalidate } from '$app/navigation';
	import * as m from '$msgs';
	import Dialog from '$lib/Web/Dialog.svelte';
	import { patchCommand } from '../../../entry.remote';

	let {
		entryUid,
		description,
		editMode
	}: { entryUid: string; description: string | null | undefined; editMode: boolean } = $props();

	const MAX = 2000;

	let dialog: HTMLDialogElement | undefined = $state();
	let typed = $state('');
	let busy = $state(false);
	let saved = $state(false);
	let refusal: string | undefined = $state();

	const canSave = $derived(!busy && typed.trim() !== (description ?? '').trim());

	function open() {
		typed = description ?? '';
		saved = false;
		refusal = undefined;
		dialog?.showModal();
	}

	async function save() {
		if (!canSave) return;
		busy = true;
		refusal = undefined;
		try {
			const result = await patchCommand({ entry: entryUid, description: typed.trim() || null });
			if (result.success) {
				saved = true;
				await invalidate('entry:now');
				dialog?.close();
			} else {
				refusal = result.status === 403 ? m.ENTRY_DESCRIPTION_ERROR_NOT_ALLOWED() : m.ENTRY_DESCRIPTION_ERROR_FAILED();
			}
		} catch {
			refusal = m.ENTRY_DESCRIPTION_ERROR_FAILED();
		} finally {
			busy = false;
		}
	}
</script>

{#if description || editMode}
	<section>
		<div class="flex items-center p-1">
			<div class="w-9"><Fa icon={faFileLines} size="sm" /></div>
			<h4 class="h4 flex place-items-center gap-1">
				{m.ENTRY_DESCRIPTION_TITLE()}{#if editMode}<button
						type="button"
						class="btn-icon variant-ghost-surface min-h-11 min-w-11"
						title={m.ENTRY_DESCRIPTION_EDIT()}
						aria-label={m.ENTRY_DESCRIPTION_EDIT()}
						data-testid="entry-description-edit"
						onclick={open}><Fa icon={faPenToSquare} /></button
					>{/if}
			</h4>
		</div>
		{#if description}
			<div class="flex">
				<div class="w-9 flex-none"></div>
				<p class="py-2 max-w-prose whitespace-pre-line text-surface-900-50-token" data-testid="entry-description">{description}</p>
			</div>
		{/if}
	</section>
{/if}

{#if editMode}
	<Dialog bind:dialog classProp="w-[90vw] sm:w-[40rem]">
		<div class="p-6 space-y-4 text-base" data-testid="entry-description-dialog">
			<h2 class="h3">{m.ENTRY_DESCRIPTION_DIALOG_TITLE()}</h2>
			<label class="label flex w-full flex-col items-start gap-1">
				<span>{m.ENTRY_DESCRIPTION_LABEL()}</span>
				<textarea class="textarea w-full text-base" rows="8" maxlength={MAX} bind:value={typed}></textarea>
			</label>
			<p class="text-surface-600-300-token text-right">{typed.length} / {MAX}</p>
			{#if refusal}
				<p class="text-error-700-200-token" data-testid="entry-description-refusal">{refusal}</p>
			{/if}
			<div class="flex flex-wrap items-center justify-end gap-2">
				{#if saved}
					<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
					<span>{m.ENTRY_DESCRIPTION_SAVED()}</span>
				{/if}
				<button type="button" class="btn min-h-11 variant-ringed-surface text-surface-900-50-token" onclick={() => dialog?.close()} disabled={busy}>
					{m.CANCEL()}
				</button>
				<button type="button" class="btn min-h-11 variant-filled-primary" disabled={!canSave} onclick={save} data-testid="entry-description-save">
					{m.ENTRY_DESCRIPTION_SAVE()}
				</button>
			</div>
		</div>
	</Dialog>
{/if}

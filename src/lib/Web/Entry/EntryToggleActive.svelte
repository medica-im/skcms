<script lang="ts">
	import * as m from '$msgs';
	import { patchCommand } from '../../../entry.remote';
	import { invalidateAll } from '$app/navigation';
	import {
		faCheck,
		faWindowClose,
		faExclamationCircle,
		faTrashCanArrowUp,
		faTriangleExclamation,
		faRotateLeft,
		faSpinner
	} from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import Dialog from '../Dialog.svelte';
	import { getEntryUid } from '$lib/components/Directory/context';
	import type { FormResult } from '$lib/interfaces/v2/form';

	let { active }: { active: Boolean } = $props();

	const uid = getEntryUid();

	let dialog: HTMLDialogElement|undefined = $state();
	let result: FormResult | undefined = $state();
	let pending = $state(false);

	// Capture the active state when the dialog opens so it doesn't flip mid-dialog
	let activeWhenOpened = $state(true);

	function openDialog() {
		activeWhenOpened = !!active;
		result = undefined;
		pending = false;
		dialog?.showModal();
	}

	async function handleSubmit() {
		pending = true;
		try {
			result = await patchCommand({
				entry: uid,
				active: !activeWhenOpened
			});
			if (result?.success) {
				invalidateAll();
				dialog?.close();
			}
		} catch (error) {
			console.error(error);
		} finally {
			pending = false;
		}
	}
</script>

{#if active}
	<button
		onclick={openDialog}
		title={m.ENTRY_DELETE()} class="btn variant-filled-error"><span><Fa icon={faTrashCanArrowUp} /></span><span>{m.ENTRY_DELETE()}</span></button
	>
{:else}
	<button
		onclick={openDialog}
		title={m.ENTRY_REACTIVATE()} class="btn variant-filled-success"><span><Fa icon={faRotateLeft} /></span><span>{m.ENTRY_REACTIVATE()}</span></button
	>
{/if}

<Dialog bind:dialog>
	<div class="rounded-lg w-[28rem] max-w-[90vw] p-6 variant-ghost-secondary gap-6 items-center place-items-center">
		<div class="grid grid-cols-1 gap-4">
			<div class="place-items-center">
			<h3 class="h3">{activeWhenOpened ? m.ENTRY_DELETE_TITLE() : m.ENTRY_REACTIVATE_TITLE()}</h3>
			</div>
			<div class="flex space-x-2 place-items-center">
				<Fa icon={faTriangleExclamation} />
				<p>{activeWhenOpened ? m.ENTRY_DELETE_CONFIRM() : m.ENTRY_REACTIVATE_CONFIRM()}</p>
			</div>
			<div>
				<p>{activeWhenOpened ? m.ENTRY_DELETE_DESCRIPTION() : m.ENTRY_REACTIVATE_DESCRIPTION()}</p>
			</div>
			<div class="flex flex-wrap gap-4 justify-end">
				<div class="flex gap-2 items-center">
					{#if result && !result?.success}
						<span class="badge-icon variant-filled-error"><Fa icon={faExclamationCircle} /></span
						>{result.text}
					{/if}
				</div>
				<button
					onclick={handleSubmit}
					disabled={pending}
					type="submit"
					class="{activeWhenOpened ? 'variant-filled-error' : 'variant-filled-success'} btn w-min"
				>
					{#if pending}
						<Fa icon={faSpinner} spin />
					{:else}
						{activeWhenOpened ? m.ENTRY_DELETE() : m.ENTRY_REACTIVATE()}
					{/if}
				</button>
				<button
					type="button"
					class="variant-filled-surface btn w-min"
					disabled={pending}
					onclick={() => {
						dialog?.close();
					}}
					>{m.CANCEL()}</button
				>
			</div>
		</div>
	</div>
</Dialog>

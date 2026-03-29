<script lang="ts">
	import * as m from '$msgs';
	import { patchCommand } from '../../../entry.remote';
	import { invalidate } from '$app/navigation';
	import {
		faEnvelope,
		faPlus,
		faCheck,
		faPenToSquare,
		faExclamationCircle,
		faTrashCanArrowUp,
		faTriangleExclamation
	} from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import Dialog from '$lib/Web/Dialog.svelte';
	import { getEntryUid } from '$lib/components/Directory/context';
	import type { FormResult } from '$lib/interfaces/v2/form';
	import type { EntryFull } from '$lib/store/directoryStoreInterface';

	let { data, editMode = false }: { data: EntryFull; owners: any; editMode?: boolean } = $props();

	const uid = getEntryUid();

	let editDialog: HTMLDialogElement;
	let deleteDialog: HTMLDialogElement;

	let emailValue = $state('');
	let initialValue = $state('');
	let editResult: FormResult | undefined = $state();
	let deleteResult: FormResult | undefined = $state();

	let disabled = $derived(
		!!patchCommand.pending || emailValue === initialValue || !emailValue || editResult?.success == true
	);
</script>
{#if editMode || !data.owner?.length || data.redeemEmail}
<div class="d-flex justify-content-between align-items-start">
	<div class="flex items-center py-2">
		<div class="w-9"><Fa icon={faEnvelope} size="sm" /></div>
		<div>
			<h3 class="h3 flex place-items-center gap-1">
				{m.REDEEM_EMAIL()}
				{#if editMode}
					<button
						onclick={() => {
							editResult = undefined;
							initialValue = emailValue = data.redeemEmail ?? '';
							editDialog.showModal();
						}}
						class="btn-icon btn-icon-sm variant-ghost-surface"
						title={data.redeemEmail == null ? m.CREATE() : m.EDIT()}><Fa icon={data.redeemEmail == null ? faPlus : faPenToSquare} /></button
					>
					{#if data.redeemEmail != null}
						<button
							onclick={() => {
								deleteResult = undefined;
								deleteDialog.showModal();
							}}
							class="btn-icon btn-icon-sm variant-ghost-surface"
							title={m.DELETE()}><Fa icon={faTrashCanArrowUp} /></button
						>
					{/if}
				{/if}
			</h3>
		</div>
	</div>

	<div class="flex items-start p-1">
		<div class="w-9"></div>
		<span class="{data.redeemEmail ? '' : 'text-surface-500'}">{data.redeemEmail ?? '—'}</span>
	</div>
</div>
{/if}
<!-- Edit/Create modal -->
<Dialog bind:dialog={editDialog}>
	<div class="rounded-lg w-96 p-8 variant-ghost-secondary gap-8 items-center place-items-center">
		<div class="grid grid-cols-1 gap-4">
			<h3 class="h3">{m.REDEEM_EMAIL()}</h3>
			<input
				type="email"
				class="input px-3 py-2"
				placeholder="email@example.com"
				bind:value={emailValue}
			/>
			<div class="flex flex-wrap gap-4 justify-end">
				<div class="flex gap-2 items-center">
					{#if editResult?.success}
						<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
					{:else if editResult && !editResult?.success}
						<span class="badge-icon variant-filled-error"><Fa icon={faExclamationCircle} /></span
						>{editResult.text}
					{/if}
				</div>
				<button
					onclick={async () => {
						try {
							editResult = await patchCommand({
								entry: uid,
								redeemEmail: emailValue || null
							});
							invalidate('entry:now');
						} catch (error) {
							console.error(error);
						}
					}}
					type="submit"
					class="variant-filled-secondary btn w-min"
					{disabled}>{m.EDIT()}</button
				>
				<button
					type="button"
					class="variant-filled-error btn w-min"
					onclick={() => editDialog.close()}
					>{#if editResult?.success || disabled}{m.CLOSE()}{:else}{m.CANCEL()}{/if}</button
				>
			</div>
		</div>
	</div>
</Dialog>

<!-- Delete confirmation modal -->
<Dialog bind:dialog={deleteDialog}>
	<div class="rounded-lg h-64 w-96 p-8 variant-ghost-secondary gap-8 items-center place-items-center">
		<div class="grid grid-cols-1 gap-4">
			<h3 class="h3">{m.REDEEM_EMAIL()}</h3>
			<div class="flex space-x-2 place-items-center">
				<Fa icon={faTriangleExclamation} />
				<p>{m.DELETE_CONFIRM()}</p>
			</div>
			<div class="flex flex-wrap gap-4 justify-end">
				<div class="flex gap-2 items-center">
					{#if deleteResult?.success}
						<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
					{:else if deleteResult && !deleteResult?.success}
						<span class="badge-icon variant-filled-error"><Fa icon={faExclamationCircle} /></span
						>{deleteResult.text}
					{/if}
				</div>
				<button
					onclick={async () => {
						try {
							deleteResult = await patchCommand({
								entry: uid,
								redeemEmail: null
							});
							invalidate('entry:now');
						} catch (error) {
							console.error(error);
						}
					}}
					type="submit"
					class="variant-filled-warning btn w-min">{m.DELETE()}</button
				>
				<button
					type="button"
					class="variant-filled-error btn w-min"
					onclick={() => deleteDialog.close()}
					>{#if deleteResult?.success}{m.CLOSE()}{:else}{m.CANCEL()}{/if}</button
				>
			</div>
		</div>
	</div>
</Dialog>

<script lang="ts">
	import * as m from '$msgs';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import { updateBoardMember } from '../../../association.remote';
	import { invalidate } from '$app/navigation';
	import { faCheck, faExclamationCircle, faPenToSquare } from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import Dialog from '../Dialog.svelte';
	import type { BoardMember } from '$lib/interfaces/v2/association';

	let {
		member
	}: {
		member: BoardMember;
	} = $props();

	let dialog: HTMLDialogElement | undefined = $state();
	let start: string = $state(member.start);
	let stop: string = $state(member.stop || '');
	let uuid: string = $state(crypto.randomUUID());
	const initial = { start: member.start, stop: member.stop || '' };
	let hasChanges = $derived(start !== initial.start || stop !== initial.stop);
	let disabled: boolean = $derived(
		!!updateBoardMember.for(uuid).pending || !hasChanges
	);

	function updateUuid() {
		uuid = crypto.randomUUID();
	}

	function resetForm() {
		start = member.start;
		stop = member.stop || '';
	}
</script>

<button
	class="btn-icon btn-icon-sm variant-ghost-secondary"
	onclick={() => {
		updateUuid();
		dialog?.showModal();
	}}
	title={m.BOARD_MEMBER_UPDATE()}
><Fa icon={faPenToSquare} /></button>

<Dialog bind:dialog>
	<div class="rounded-lg p-4 variant-ghost-secondary space-y-4">
		<h3 class="h3">{capitalizeFirstLetter(m.BOARD_MEMBER_UPDATE())}</h3>
		<form
			{...updateBoardMember.for(uuid).enhance(async ({ submit }) => {
				try {
					await submit();
					invalidate('association:data');
				} catch (error) {
					console.error(error);
				}
			})}
		>
			<div class="space-y-4">
				<input class="hidden" name="uid" type="text" value={member.uid} />

				<label class="label">
					<span>{m.COL_START()}</span>
					<input
						oninput={() => {}}
						class="input"
						name="start"
						type="date"
						bind:value={start}
					/>
				</label>

				<label class="label">
					<span>{m.COL_STOP()}</span>
					<input
						oninput={() => {}}
						class="input"
						name="stop"
						type="date"
						bind:value={stop}
					/>
				</label>

				<div class="flex gap-4 items-center">
					{#if updateBoardMember.for(uuid).result?.success}
						<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
					{:else if updateBoardMember.for(uuid).result?.success === false}
						<span class="badge-icon variant-filled-error"><Fa icon={faExclamationCircle} /></span>
						<span class="text-sm">{updateBoardMember.for(uuid).result?.response?.detail || updateBoardMember.for(uuid).result?.text}</span>
					{/if}
					<button type="submit" class="variant-filled-secondary btn" {disabled}>{m.BOARD_MEMBER_UPDATE()}</button>
					<button
						type="button"
						class="variant-filled-error btn"
						onclick={() => {
							dialog?.close();
							resetForm();
						}}
					>{#if updateBoardMember.for(uuid).result?.success}{m.CLOSE()}{:else}{m.CANCEL()}{/if}</button>
				</div>
			</div>
		</form>
	</div>
</Dialog>

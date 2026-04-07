<script lang="ts">
	import * as m from '$msgs';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import { createBoardMember } from '../../../association.remote';
	import { invalidate } from '$app/navigation';
	import { faCheck, faExclamationCircle, faPlus } from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import Select from 'svelte-select';
	import NoOptions from '$lib/Web/NoOptions.svelte';
	import Dialog from '../Dialog.svelte';
	import type { Effector } from '$lib/interfaces/v2/effector';
	import type { SelectType } from '$lib/interfaces/select';

	let {
		effectors,
		entryUid
	}: {
		effectors: Effector[];
		entryUid: string;
	} = $props();

	let dialog: HTMLDialogElement;
	let selectedEffector: SelectType | undefined = $state();
	let effectorUid: string = $derived(selectedEffector?.value || '');
	let start: string = $state('');
	let stop: string = $state('');
	let result = $derived(createBoardMember.result);
	let disabled: boolean = $derived(
		!!createBoardMember.pending || !effectorUid || !start || result?.success === true
	);

	let effectorItems = $derived(
		effectors.map((e) => ({ label: e.name_fr, value: e.uid }))
	);

	function resetForm() {
		selectedEffector = undefined;
		start = '';
		stop = '';
		result = undefined;
	}
</script>

<button
	class="btn-icon btn-icon-sm variant-ghost-surface"
	onclick={() => {
		resetForm();
		dialog.showModal();
	}}
	title={m.BOARD_MEMBER_CREATE()}
><Fa icon={faPlus} /></button>

<Dialog bind:dialog>
	<div class="rounded-lg p-4 variant-ghost-secondary space-y-4">
		<h3 class="h3">{capitalizeFirstLetter(m.BOARD_MEMBER_CREATE())}</h3>
		<form
			{...createBoardMember.enhance(async ({ submit }) => {
				try {
					await submit();
					invalidate('entry:now');
				} catch (error) {
					console.error(error);
				}
			})}
		>
			<div class="space-y-4">
				<input class="hidden" name="entry_uid" type="text" value={entryUid} />
				<input class="hidden" name="effector_uid" type="text" bind:value={effectorUid} />

				<label class="label">
					<span>{m.COL_EFFECTOR()}</span>
					{#each createBoardMember.fields.effector_uid.issues() as issue}
						<p class="text-error-500 text-sm">{issue.message}</p>
					{/each}
					<Select
						items={effectorItems}
						bind:value={selectedEffector}
						searchable={true}
					><NoOptions slot="empty" /></Select>
				</label>

				<label class="label">
					<span>{m.COL_START()}</span>
					{#each createBoardMember.fields.start.issues() as issue}
						<p class="text-error-500 text-sm">{issue.message}</p>
					{/each}
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
					{#if result?.success}
						<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
					{:else if result && !result?.success}
						<span class="badge-icon variant-filled-error"><Fa icon={faExclamationCircle} /></span>
						<span class="text-sm">{result?.response?.detail || result?.text}</span>
					{/if}
					<button type="submit" class="variant-filled-secondary btn" {disabled}>{m.BOARD_MEMBER_CREATE()}</button>
					<button
						type="button"
						class="variant-filled-error btn"
						onclick={() => {
							dialog.close();
							resetForm();
						}}
					>{#if result?.success}{m.CLOSE()}{:else}{m.CANCEL()}{/if}</button>
				</div>
			</div>
		</form>
	</div>
</Dialog>

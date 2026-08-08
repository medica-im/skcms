<script lang="ts">
	import * as m from '$msgs';
	import { patchCommand, getAvailableDirectories } from '../../../entry.remote';
	import { invalidate } from '$app/navigation';
	import {
		faFolderOpen,
		faPenToSquare,
		faCheck,
		faExclamationCircle
	} from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import Select from '$lib/Web/Select.svelte';
	import NoOptions from '$lib/Web/NoOptions.svelte';
	import Dialog from '$lib/Web/Dialog.svelte';
	import { getEntryUid } from '$lib/components/Directory/context';
	import { areArraysEqualSets } from '$lib/utils/utils.ts';
	import type { FormResult } from '$lib/interfaces/v2/form';
	import type { EntryFull, AvailableDirectory } from '$lib/store/directoryStoreInterface';

	let { data, editMode = false }: { data: EntryFull; editMode?: boolean } = $props();

	const uid = getEntryUid();

	type SelectType = { label: string; value: string };

	let dialog: HTMLDialogElement;

	let availableDirectories: AvailableDirectory[] | undefined = $state();
	let choices: SelectType[] | undefined = $state();
	let selectedItems: SelectType[] | null | undefined = $state();
	let result: FormResult | undefined = $state();

	const getItems = (directories: AvailableDirectory[]) =>
		directories.map((d) => ({ label: d.display_name, value: d.name }));

	let commandData = $derived({
		entry: uid,
		directories: selectedItems == undefined ? [] : selectedItems.map((e) => e.value)
	});

	let hasNoSelection = $derived(!selectedItems || selectedItems.length === 0);

	let disabled = $derived(
		!!patchCommand.pending ||
			hasNoSelection ||
			areArraysEqualSets(selectedItems?.map((e) => e.value) ?? [], data.directories ?? []) ||
			result?.success == true
	);
</script>

<div class="d-flex justify-content-between align-items-start">
	<div class="flex items-center py-2">
		<div class="w-9"><Fa icon={faFolderOpen} size="sm" /></div>
		<div>
			<h4 class="h4 flex place-items-center gap-1">
				{m.ENTRY_DIRECTORIES()}
				{#if editMode}
					<button
						onclick={async () => {
							result = undefined;
							if (!availableDirectories) {
								availableDirectories = await getAvailableDirectories();
								choices = getItems(availableDirectories ?? []);
							}
							selectedItems = choices?.filter((e) => data.directories?.includes(e.value));
							dialog.showModal();
						}}
						class="btn-icon btn-icon-sm variant-ghost-surface"
						title={m.EDIT()}><Fa icon={faPenToSquare} /></button
					>
				{/if}
			</h4>
		</div>
	</div>

	<div class="flex items-start p-1">
		<div class="w-9"></div>
		<span class={data.directories?.length ? '' : 'text-surface-500'}>
			{data.directories?.length ? data.directories.join(', ') : m.ENTRY_DIRECTORIES_NONE()}
		</span>
	</div>
</div>

<Dialog bind:dialog>
	<div class="rounded-lg h-96 w-96 p-4 variant-ghost-secondary items-center place-items-center">
		<div class="grid grid-cols-1 item-center place-items-center gap-12 w-full">
			<h3 class="h3">{m.ENTRY_DIRECTORIES()}</h3>
			<Select multiple items={choices} bind:value={selectedItems}><NoOptions slot="empty" /></Select>
			{#if hasNoSelection}
				<p class="text-sm text-error-500">{m.ENTRY_DIRECTORIES_REQUIRED()}</p>
			{/if}
			<div class="flex w-full items-center">
				<div class="w-1/3">
					{#if result?.success}
						<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
					{:else if result && !result?.success}
						<span class="badge-icon variant-filled-error"><Fa icon={faExclamationCircle} /></span
						>{result.text}
					{/if}
				</div>
				<div class="w-2/3">
					<div class="flex gap-2">
						<button
							onclick={async () => {
								try {
									result = await patchCommand(commandData);
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
							onclick={() => dialog.close()}
							>{#if result?.success}{m.CLOSE()}{:else}{m.CANCEL()}{/if}</button
						>
					</div>
				</div>
			</div>
		</div>
	</div>
</Dialog>

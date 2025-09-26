<script lang="ts">
	import { onMount } from 'svelte';
	import * as m from '$msgs';
	import { patchCommand, getConventions } from '../../../../entry.remote';
	import { invalidate } from '$app/navigation';
	import {
		faPlus,
		faCheck,
		faWindowClose,
		faPenToSquare,
		faExclamationCircle,
		faTrashCanArrowUp
	} from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import type { Email } from '$lib/interfaces/email.interface.ts';
	import Select from 'svelte-select';
	import Dialog from '../../Dialog.svelte';
	import { getEntryUid } from '$lib/components/Directory/context';
	import type { Convention } from '$lib/interfaces/fullEffector.interface';
	import type { FormResult } from '$lib/interfaces/v2/form';

	let {
		data
	}: {
		data: Convention | null;
	} = $props();

	let res = $state();

	const uid = getEntryUid();

	type SelectType = { label: string; value: string };

	let dialog: HTMLDialogElement;

	let conventions: Convention[] | undefined = $state();

	const getItems = (conventions: Convention[]) => {
		const items: SelectType[] = [];
		conventions.forEach((e) => {
			const item = { label: e.label, value: e.name };
			items.push(item);
		});
		return items;
	};
	const getSelectedItem = () => {
		return choices?.find((e) => data?.name == e.value);
	};
	let choices: SelectType[] | undefined = $state();
	let result: FormResult | undefined = $state();
	let selectedItem: SelectType | undefined = $state();
	let commandData = $derived({
		entry: uid,
		convention: selectedItem !== undefined ? selectedItem?.value : null
	});

	let disabled: boolean = $derived(selectedItem?.value == data?.name);

	onMount(async () => {
		conventions = await getConventions();
		if (conventions) {
			choices = getItems(conventions);
		}
		selectedItem = getSelectedItem();
	});
</script>

<button
	onclick={async () => {
		result = undefined;
		selectedItem = getSelectedItem();
		dialog.showModal();
	}}
	class={data ? '' : 'btn-icon btn-icon-sm variant-ghost-surface'}
	title={data ? 'Modifier' : 'Créer'}><Fa icon={data ? faPenToSquare : faPlus} /></button
>

<Dialog bind:dialog>
	<div class="rounded-lg h-96 w-96 p-4 variant-ghost-secondary items-center place-items-center">
		<!--p class="text-sm">data: {JSON.stringify(data?.name)}</p>
		<p class="text-sm">selectedItem: {JSON.stringify(getSelectedItem())}</p>
		<p class="text-sm">commandData: {JSON.stringify(commandData)}</p-->
		<div class="grid grid-cols-1 item-center place-items-center gap-12 w-full">
			<h3 class="h3">Convention</h3>
				<Select items={choices} bind:value={selectedItem} />
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
									//console.log(JSON.stringify(res));
									invalidate('entry:now');
								} catch (error) {
									console.error(error);
								}
							}}
							type="submit"
							class="variant-filled-secondary btn w-min"
							{disabled}>Envoyer</button
						>
						<button
							type="button"
							class="variant-filled-error btn w-min"
							onclick={() => {
								dialog.close();
							}}
							>{#if result?.success || disabled}Fermer{:else}Annuler{/if}</button
						>
					</div>
				</div>
			</div>
		</div>
	</div>
</Dialog>

<style>
	.select {
		position: relative;
		z-index: 1000;
	}
</style>

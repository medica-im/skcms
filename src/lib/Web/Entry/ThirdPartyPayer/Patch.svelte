<script lang="ts">
	import { onMount } from 'svelte';
	import * as m from '$msgs';
	import { patchCommand, getThirdPartyPayers } from '../../../../entry.remote';
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
	import type { ThirdPartyPayer } from '$lib/interfaces/fullEffector.interface';
	import type { FormResult } from '$lib/interfaces/v2/form';

	let {
		data
	}: {
		data: ThirdPartyPayer[] | null;
	} = $props();

	let res = $state();

	const uid = getEntryUid();

	type SelectType = { label: string; value: string };

	let dialog: HTMLDialogElement;

	let payers: ThirdPartyPayer[] | undefined = $state();

	const getItems = (payers: ThirdPartyPayer[]) => {
		const items: SelectType[] = [];
		payers.forEach((e) => {
			const item = { label: e.label_fr, value: e.name };
			items.push(item);
		});
		return items;
	};

	let choices: SelectType[] | undefined = $state();
	let result: FormResult | undefined = $state();
	let selectedItems: SelectType[] | undefined = $state();
	let commandData = $derived({
		entry: uid,
		third_party_payer: selectedItems !== undefined ? selectedItems?.map((e) => e.value) : null
	});

	let disabled: boolean = $derived(selectedItems?.map((e) => e.value) == data?.map((e) => e.name));

	onMount(async () => {
		payers = await getThirdPartyPayers();
		console.log(JSON.stringify(payers))
		if (payers) {
			choices = getItems(payers);
		}
		selectedItems = choices?.filter((e) => {
			return data?.map((e) => e.name).includes(e.value);
		});
	});
</script>

<button
	onclick={async () => {
		result = undefined;
		selectedItems = choices?.filter((e) => {
			return data?.map((e) => e.name).includes(e.value);
		});
		dialog.showModal();
	}}
	class={data ? '' : 'btn-icon btn-icon-sm variant-ghost-surface'}
	title={data==null ? "Créer":"Modifier"}><Fa icon={data ? faPenToSquare : faPlus} /></button
>

<Dialog bind:dialog on:close={() => console.log('closed')}>
	<div class="rounded-lg h-96 w-96 p-4 variant-ghost-secondary items-center place-items-center">
		<!--p class="text-sm">data: {JSON.stringify(data?.map(e=>e.name))}</p>
		<p class="text-sm">selectedItems: {JSON.stringify(selectedItems?.map(e=>e.value))}</p>
		<p class="text-sm">commandData: {JSON.stringify(commandData)}</p-->
		<div class="grid grid-cols-1 item-center place-items-center gap-12 w-full">
			<h3 class="h3">{m.ADDRESSBOOK_THIRD_PARTY_PAYER()}</h3>
			<Select multiple items={choices} bind:value={selectedItems} />
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
									console.log(JSON.stringify(res));
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

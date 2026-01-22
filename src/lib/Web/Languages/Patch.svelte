<script lang="ts">
	import * as m from '$msgs';
	import { patchCommand } from './../../../effector.remote';
	import { invalidate } from '$app/navigation';
	import {
		faPlus,
		faCheck,
		faPenToSquare,
		faExclamationCircle
	} from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import Select from 'svelte-select';
	import Dialog from '$lib/Web/Dialog.svelte';
	import { getEffectorUid } from '$lib/components/Directory/context';
	import languagesFr from './languages_fr.json';
	import { areArraysEqualSets } from '$lib/utils/utils';
	import type { FormResult } from '$lib/interfaces/v2/form';
	import type { SpokenLanguage } from '$lib/interfaces/fullEffector.interface';

	let {
		data
	}: {
		data: SpokenLanguage[] | null;
	} = $props();

	let res = $state();

	const uid = getEffectorUid();

	type SelectType = { label: string; value: string };

	let dialog: HTMLDialogElement | undefined = $state();

	const items = () => {
		const arr = [];
		for (const [key, value] of Object.entries(languagesFr)) {
			arr.push({ label: value, value: key });
		}
		return arr;
	};
	const getItems = () => {
		if (data == null) return undefined;
		return items().filter((i) => data.map((e) => e.tag).includes(i.value));
	};

	const getLangData = () => {
		if (selectedItems == undefined) return null;
		return selectedItems.map((e) => e.value);
	};

	let result: FormResult | undefined = $state();
	let selectedItems: SelectType[] | undefined = $state(getItems());
	let commandData = $derived({
		effector: uid,
		spoken_languages: getLangData()
	});

	let disabled: boolean = $derived(
		!!patchCommand.pending ||
			result?.success ||
			(data === null && selectedItems === undefined) ||
			(!!data &&
				!!selectedItems &&
				areArraysEqualSets(
					selectedItems.map((e) => e.value),
					data.map((e) => e.tag)
				))
	);
</script>

<button
	onclick={() => {
		result = undefined;
		selectedItems = getItems();
		dialog?.showModal();
	}}
	class={data ? '' : 'btn-icon btn-icon-sm variant-ghost-surface'}
	title={data ? 'Modifier' : 'Créer'}><Fa icon={data ? faPenToSquare : faPlus} /></button
>

<Dialog bind:dialog>
	<div
		class="rounded-lg h-96 w-96 p-8 variant-ghost-secondary gap-8 items-center place-items-center"
	>
		<!--p>{JSON.stringify(data)}</p-->
		<!--p>selectedItems: {JSON.stringify(selectedItems)}</p>
		<p>commandData: {JSON.stringify(commandData)}</p-->
		<div class="grid grid-cols-1 gap-4">
			<h3 class="h3">Langues</h3>
			<Select multiple items={items()} bind:value={selectedItems} />
			<div class="flex flex-wrap gap-4 justify-end">
				<div class="flex gap-2 items-center">
					{#if result?.success}
						<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
					{:else if result && !result?.success}
						<span class="badge-icon variant-filled-error"><Fa icon={faExclamationCircle} /></span
						>{result.status} {result.data.detail}
					{/if}
				</div>
				<button
					onclick={async () => {
						try {
							result = await patchCommand(commandData);
							if (result?.success === true) {
								invalidate('entry:now');
								disabled = true;
							}
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
						dialog?.close();
					}}
					>{#if result?.success || disabled}Fermer{:else}Annuler{/if}</button
				>
			</div>
		</div>
	</div>
</Dialog>

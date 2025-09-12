<script lang="ts">
	import * as m from '$msgs';
	import { createPhone } from '../../../phone.remote';
	import { invalidate } from '$app/navigation';
	import {
		faCheck,
		faWindowClose,
		faPenToSquare,
		faExclamationCircle,
		faTrashCanArrowUp,
		faPlus,
		faSquarePlus
	} from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import type { Phone } from '$lib/interfaces/phone.interface.ts';
	import Select from 'svelte-select';
	import Dialog from '../Dialog.svelte';
	import { copy } from 'svelte-copy';
	import { page } from '$app/state';
	import { accessSelectTypes, getRoles } from '$lib/Web/access.ts';
	import type { SelectType } from '$lib/interfaces/select.ts';
	import type { FormResult } from '$lib/interfaces/v2/form';

	let {
		entry
	}: {
		entry: string;
	} = $props();

	const isSuperUser = $derived(page.data?.user?.role == 'superuser');

	let dialog: HTMLDialogElement;

	let result: FormResult | undefined = $state();

	const types = {
		M: 'Mobile',
		MW: 'Mobile Work',
		W: 'Work',
		F: 'Fax',
		AS: 'Answering service'
	};

	const getTypeItems = () => {
		const items = [];
		for (const [key, value] of Object.entries(types)) {
			items.push({ label: value, value: key });
		}
		return items;
	};

	let _phone: string | undefined = $state();
	let selectedType: SelectType | undefined = $state();
	let selectedAccess: SelectType | undefined = $state();
	let _type: string | undefined = $derived(selectedType?.value);
	let _roles: string[] | undefined = $derived(getRoles(selectedAccess?.value));
	let disabled: boolean = $derived(
		selectedType == undefined || _phone == undefined || selectedAccess == undefined
	);
	function resetForm() {
		_phone = undefined;
		_type = undefined;
		selectedType = undefined;
		selectedAccess = undefined;
		result = undefined;
	}
</script>

<button
	class="btn-icon btn-icon-sm variant-ghost-surface"
	onclick={() => {
		dialog.showModal();
	}}
	title="Ajouter"><Fa icon={faPlus} /></button
>

<Dialog bind:dialog>
	<div class="rounded-lg h-96 p-4 variant-ghost-secondary gap-2 items-center place-items-center">
		<!--p>phone: {_phone} type: {_type} roles: {_roles}</p-->

		<form
			{...createPhone.enhance(async ({ form, data, submit }) => {
				try {
					//data = manipulateForm(data);
					const dataString = JSON.stringify(Object.fromEntries(data));
					console.log(dataString);
					await submit();
					result = createPhone.result;
					invalidate('entry:now');
				} catch (error) {
					console.log(error);
				}
			})}
		>
			<div class="p-2 space-y-4 justify-items-stretch gap-6">
				<div class="p-2 space-y-2 w-full">
					<label class="flex label place-self-start place-items-center space-x-2 w-full">
						<input
							oninput={() => {}}
							class="input hidden"
							name="entry"
							type="text"
							placeholder=""
							bind:value={entry}
						/>
					</label>
					{#if isSuperUser}
						Entry UID: {entry}
						<button type="button" class="btn btn-sm variant-ghost" use:copy={entry}> Copy! </button>
					{/if}
					<label class="flex label place-self-start place-items-center space-x-2 w-full">
						<span>Téléphone:</span>
						<input
							oninput={() => {}}
							class="input"
							name="phone"
							type="text"
							placeholder=""
							bind:value={_phone}
						/>
					</label>
					<label class="flex label place-self-start place-items-center space-x-2 w-full">
						<span>Type:</span>
						<input
							oninput={() => {}}
							class="input hidden"
							name="type"
							type="text"
							placeholder=""
							bind:value={_type}
						/>
						<Select items={getTypeItems()} bind:value={selectedType} />
					</label>
					<label class="flex label place-self-start place-items-center space-x-2 w-full">
						<span>Accès:</span>
						<input
							oninput={() => {}}
							class="input hidden"
							name="roles"
							type="text"
							placeholder=""
							bind:value={_roles}
						/>
						<Select items={accessSelectTypes} bind:value={selectedAccess} />
					</label>
				</div>
			</div>
			<div class="flex w-full items-center">
				<div class="w-1/3">
					{#if result?.success}
						<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
					{:else if result && !result?.success}
						<span class="badge-icon variant-filled-error"><Fa icon={faExclamationCircle} /></span
						>{result.text}
					{/if}
				</div>
				<div class="w-2/3 flex gap-2">
					<button type="submit" class="variant-filled-secondary btn w-min" {disabled}>Créer</button>
					<div class="w-auto justify-center">
						<button
							type="button"
							class="variant-filled-error btn w-min"
							onclick={() => {
								dialog.close();
								resetForm();
							}}
							>{#if result?.success || disabled}Fermer{:else}Annuler{/if}</button
						>
					</div>
				</div>
			</div>
		</form>
	</div>
</Dialog>

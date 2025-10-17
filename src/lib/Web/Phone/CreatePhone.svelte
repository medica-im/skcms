<script lang="ts">
	import * as m from '$msgs';
	import { phoneTypes } from '$lib/Directory/Phone/phone.ts';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
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

	const getTypeItems = () => {
		const items = [];
		for (const [key, value] of Object.entries(phoneTypes)) {
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
		selectedType == undefined || _phone == undefined || selectedAccess == undefined || createPhone.result?.success==true
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
	<div class="rounded-lg h-fit p-4 variant-ghost-secondary gap-4">
		<!--p>phone: {_phone} type: {_type} roles: {_roles}</p-->

		<form
			{...createPhone.enhance(async ({ form, data, submit }) => {
				try {
					const dataString = JSON.stringify(data);
					console.log(dataString);
					await submit();
					result = createPhone.result;
					invalidate('entry:now');
				} catch (error) {
					console.log(error);
				}
			})}
		>
			<h3 class="h3">Téléphone</h3>

			<div class="p-2 space-y-4 gap-6">
					<label class="label">
						<span></span>
						<input
							oninput={() => {}}
							class="input hidden"
							name="entry"
							type="text"
							placeholder=""
							bind:value={entry}
						/>
					</label>
					<!--{#if isSuperUser}
						Entry UID: {entry}
						<button type="button" class="btn btn-sm variant-ghost" use:copy={entry}> Copy! </button>
					{/if}-->
					<label class="label">
						<span>{capitalizeFirstLetter(m.PHONE_NUMBER())}</span>
						<input
							oninput={() => {}}
							class="input"
							name="phone"
							type="text"
							placeholder=""
							bind:value={_phone}
						/>
					</label>
					<label class="label">
						<span>Type</span>
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
					<label class="label">
						<span>Accès</span>
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

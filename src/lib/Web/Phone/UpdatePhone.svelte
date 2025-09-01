<script lang="ts">
	import * as m from '$msgs';
	import { updatePhone } from '../../../phone.remote';
	import { invalidate } from '$app/navigation';
	import { faCheck, faWindowClose, faPenToSquare, faExclamationCircle, faTrashCanArrowUp } from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import type { Phone } from '$lib/interfaces/phone.interface.ts';
	import Select from 'svelte-select';
	import Dialog from '../Dialog.svelte';
	import { accessSelectTypes, getRoles, getSelectedAccess } from '$lib/Web/access.ts';
	import type { SelectType } from '$lib/interfaces/select.ts';
	import type { FormResult } from '$lib/interfaces/v2/form';
	import { dataTagErrorSymbol } from '@tanstack/svelte-query';

	let {
		phoneData
	}: {
		phoneData: Phone;
	} = $props();

	let dialog: HTMLDialogElement;

	let roles: string[] = $derived(phoneData.roles.map(e=>e.name));

	let result: FormResult | undefined = $state();

	const types = {
		M: 'Mobile',
		MW: 'Mobile Work',
		W: 'Work',
		F: 'Fax',
		AS: 'Answering service'
	};
	const getItems = () => {
		const items = [];
		for (const [key, value] of Object.entries(types)) {
			items.push({ label: value, value: key });
		}
		return items;
	};
	
	let _id: number = $state(phoneData.id);
	let _phone: string = $state(phoneData.phone);
	let selectedType: SelectType | undefined = $state({
		label: types[phoneData.type],
		value: phoneData.type
	});
	let _type: string = $derived(selectedType.value);
	let selectedAccess: SelectType|undefined = $state(getSelectedAccess(phoneData.roles.map(e=>e.name)));
	let _roles: string[]|undefined = $derived(getRoles(selectedAccess?.value))
	console.log(roles);
	console.log(getSelectedAccess(roles))
	console.log(`selectedAccess:${JSON.stringify(selectedAccess)}`)
	let disabled: boolean = $derived(
		selectedType.value == phoneData.type && _phone == phoneData.phone && ( selectedAccess?.value == getSelectedAccess(roles)?.value  )
	);
	function manipulateForm(data: FormData) {
		data.append('id', _id.toString());
		data.append('phone', _phone);
		data.append('type', _type);
		return data;
	}
	function resetForm() {
		_phone=phoneData.phone;
		_type=phoneData.type;
		selectedType={label: types[phoneData.type],
		value: phoneData.type};
		selectedAccess=getSelectedAccess(phoneData.roles.map(e=>e.name));
		result=undefined;
	}
</script>

<button onclick={() => {invalidate('entry:now'); dialog.showModal(); resetForm();}} title="Modifier"><Fa icon={faPenToSquare} /></button>

<Dialog bind:dialog={dialog} on:close={() => console.log('closed')}>
	<div class="rounded-lg p-4 variant-ghost-secondary gap-2 items-center place-items-center">
		<button id="close" aria-label={m.CLOSE()} onclick={()=>dialog.close()} class="btn variant-ringed" formnovalidate><Fa icon={faWindowClose}/></button>
		<p>id: {_id} phone: {_phone} type: {_type} selectedAccess: {selectedAccess} roles: {roles}</p>

		<form
			{...updatePhone.enhance(async ({ form, data, submit }) => {
				try {
					//data = manipulateForm(data);
					const dataString = JSON.stringify(Object.fromEntries(data));
					console.log(dataString);
					await submit();
					result=updatePhone.result;
					invalidate('entry:now');
				} catch (error) {
					console.log(error);
				}
			})}
		>
			<div class="p-2 space-y-4 justify-items-stretch gap-6">
				<div class="p-2 space-y-2 w-full">
					<label class="flex label place-self-start place-items-center space-x-2 w-full">
						<span>ID</span>
						<input
							oninput={() => {}}
							class="input hidden"
							name="id"
							type="text"
							placeholder=""
							bind:value={_id}
						/>
					</label>
					<div class="badge variant-ghost-surface">{phoneData.id}</div>

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
						<Select items={getItems()} bind:value={selectedType} />
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
			<div class="flex gap-8">
				<div class="w-auto justify-center">
					<button type="submit" class="variant-filled-secondary btn w-min" {disabled}
						>Envoyer</button
					>
				</div>
				<div class="flex gap-2 items-center">
					{#if result?.success}
						<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
					{:else if result && !result?.success}
						<span class="badge-icon variant-filled-error"><Fa icon={faExclamationCircle} /></span>{result.text}
					{/if}
				</div>
				<div class="w-auto justify-center">
					<button type="button" class="variant-filled-error btn w-min" onclick={()=>{dialog.close(); resetForm();}}
						>{#if result?.success || disabled}Fermer{:else}Annuler{/if}</button
					>
				</div>
			</div>
		</form>
	</div>
</Dialog>

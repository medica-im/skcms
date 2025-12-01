<script lang="ts">
	import * as m from '$msgs';
	import { phoneTypes } from '$lib/Directory/Phone/phone.ts';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import { updatePhone } from '../../../phone.remote';
	import { invalidate } from '$app/navigation';
	import {
		faCheck,
		faWindowClose,
		faPenToSquare,
		faExclamationCircle,
		faTrashCanArrowUp
	} from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import type { Phone } from '$lib/interfaces/phone.interface.ts';
	import Select from 'svelte-select';
	import Dialog from '../Dialog.svelte';
	import { accessSelectTypes, getRoles, getSelectedAccess } from '$lib/Web/access.ts';
	import type { SelectType } from '$lib/interfaces/select.ts';

	let {
		data
	}: {
		data: Phone;
	} = $props();

	let dialog: HTMLDialogElement | undefined = $state();

	let roles: string[] | undefined = $derived(data.roles?.map((e) => e.name));

	const getItems = () => {
		const items = [];
		for (const [key, value] of Object.entries(phoneTypes)) {
			items.push({ label: value, value: key });
		}
		return items;
	};
	let _phone: string = $state(data.phone);
	let selectedType: SelectType | undefined = $state({
		label: phoneTypes[data.type],
		value: data.type
	});
	let _type: string = $derived(selectedType.value);
	let selectedAccess: SelectType | undefined = $state(
		getSelectedAccess(data.roles?.map((e) => e.name))
	);
	let _roles: string[] | undefined = $derived(getRoles(selectedAccess?.value));
	//console.log(roles);
	//console.log(getSelectedAccess(roles));
	//console.log(`selectedAccess:${JSON.stringify(selectedAccess)}`);
	let disabled: boolean = $derived(
		selectedType.value == data.type &&
			_phone == data.phone &&
			selectedAccess?.value == getSelectedAccess(roles)?.value
	);
	let result = $derived(updatePhone.for(data.id.toString()).result);
	function resetForm() {
		_phone = data.phone;
		//_type=data.type;
		selectedType = { label: phoneTypes[data.type], value: data.type };
		selectedAccess = getSelectedAccess(data.roles?.map((e) => e.name));
		result = undefined;
	}
	let uuid: string = $state(crypto.randomUUID());
	function updateUuid() {
		uuid = crypto.randomUUID();
	}
</script>

<button
	onclick={() => {
		resetForm();
		dialog?.showModal();
	}}
	title="Modifier"><Fa icon={faPenToSquare} /></button
>

<Dialog bind:dialog>
	<div class="rounded-lg h-96 p-4 variant-ghost-secondary gap-2 items-center place-items-center">
		<!--p>id: {data.id} phone: {_phone} type: {_type} selectedAccess: {selectedAccess} roles: {roles}</p-->
		<form
			{...updatePhone.for(data.id.toString()).enhance(async ({ form, data, submit }) => {
				try {
					const dataString = JSON.stringify(data);
					console.log(dataString);
					await submit();
					invalidate('entry:now');
				} catch (error) {
					console.error(error);
				}
			})}
		>
			<div class="p-2 space-y-4 justify-items-stretch gap-6">
				<div class="p-2 space-y-2 w-full">
					<input
						oninput={() => {}}
						class="input hidden"
						name="id"
						type="text"
						placeholder=""
						value={data.id}
					/>
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
					{#each updatePhone.fields.phone.issues() as issue}
						<p class="issue">{issue.message}</p>
					{/each}
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
						<Select items={getItems()} bind:value={selectedType} />
					</label>
					{#each updatePhone.fields.type.issues() as issue}
						<p class="issue">{issue.message}</p>
					{/each}
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
					{#each updatePhone.fields.roles.issues() as issue}
						<p class="issue">{issue.message}</p>
					{/each}
				</div>
			</div>
			<div class="flex gap-8">
				<div class="flex gap-2 items-center">
					{#if result?.success}
						<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
					{:else if result?.text}
						<span class="badge-icon variant-filled-error"><Fa icon={faExclamationCircle} /></span
						><span class="text-base">{result?.response?.detail || result?.text}</span>
					{/if}
				</div>
				<div class="w-auto justify-center">
					<button type="submit" class="variant-filled-secondary btn w-min" {disabled}
						>Envoyer</button
					>
				</div>
				<div class="w-auto justify-center">
					<button
						type="button"
						class="variant-filled-error btn w-min"
						onclick={() => {
							resetForm();
							dialog?.close();
						}}
						>{#if result?.success || disabled}Fermer{:else}Annuler{/if}</button
					>
				</div>
			</div>
		</form>
	</div>
</Dialog>
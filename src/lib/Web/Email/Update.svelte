<script lang="ts">
	import * as m from '$msgs';
	import { updateEmail } from '../../../email.remote';
	import { invalidate } from '$app/navigation';
	import {
		faCheck,
		faWindowClose,
		faPenToSquare,
		faExclamationCircle,
		faTrashCanArrowUp
	} from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import type { Email } from '$lib/interfaces/email.interface.ts';
	import Select from 'svelte-select';
	import Dialog from '../Dialog.svelte';
	import { accessSelectTypes, getAccess, getRoles, getSelectedAccess } from '$lib/Web/access.ts';
	import type { SelectType } from '$lib/interfaces/select.ts';
	import type { FormResult } from '$lib/interfaces/v2/form';

	let {
		data
	}: {
		data: Email;
	} = $props();

	let dialog: HTMLDialogElement;

	let roles: string[] = $derived(data.roles.map((e) => e.name));

	let result: FormResult | undefined = $state();
	let _email: string = $state(data.email);
	let selectedAccess: SelectType | undefined = $state(
		getSelectedAccess(data.roles.map((e) => e.name))
	);
	let _roles: string[] | undefined = $derived(getRoles(selectedAccess?.value));

	let disabled: boolean = $derived(
		selectedAccess?.value == getSelectedAccess(roles)?.value && _email == data.email
	);

	function resetForm() {
		_email = data.email;
		//_type=phoneData.type;
		//selectedType={label: types[phoneData.type],
		//value: phoneData.type};
		result = undefined;
	}
</script>

<button
	onclick={() => {
		dialog.showModal();
	}}
	title="Modifier"><Fa icon={faPenToSquare} /></button
>

<Dialog bind:dialog on:close={() => console.log('closed')}>
	<div class="rounded-lg h-64 p-4 variant-ghost-secondary gap-2 items-center place-items-center">
		<form
			{...updateEmail.enhance(async ({ form, data, submit }) => {
				try {
					//data = manipulateForm(data);
					const dataString = JSON.stringify(Object.fromEntries(data));
					console.log(dataString);
					await submit();
					result = updateEmail.result;
					invalidate('entry:now');
				} catch (error) {
					console.log(error);
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

					<label class="flex label place-self-start place-items-center space-x-2 w-full">
						<span>Adresse électronique</span>
						<input
							oninput={() => {}}
							class="input"
							name="email"
							type="email"
							placeholder=""
							bind:value={_email}
						/>
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
				<div class="flex gap-2 items-center">
					{#if result?.success}
						<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
					{:else if result && !result?.success}
						<span class="badge-icon variant-filled-error"><Fa icon={faExclamationCircle} /></span
						>{result.text}
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
							dialog.close();
							resetForm();
						}}
						>{#if result?.success || disabled}Fermer{:else}Annuler{/if}</button
					>
				</div>
			</div>
		</form>
	</div>
</Dialog>

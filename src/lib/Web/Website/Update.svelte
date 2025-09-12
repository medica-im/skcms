<script lang="ts">
	import * as m from '$msgs';
	import { update } from '../../../website.remote';
	import { invalidate } from '$app/navigation';
	import { faCheck, faWindowClose, faPenToSquare, faExclamationCircle, faTrashCanArrowUp } from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import type { Website } from '$lib/interfaces/website.interface.ts';
	import Select from 'svelte-select';
	import Dialog from '../Dialog.svelte';
	import { accessSelectTypes, getAccess, getRoles, getSelectedAccess } from '$lib/Web/access.ts';
	import type { SelectType } from '$lib/interfaces/select.ts';
	import type { FormResult } from '$lib/interfaces/v2/form';
	import WebsiteComponent from '$lib/Website/Website.svelte';

	let {
		data
	}: {
		data: Website;
	} = $props();

	let dialog: HTMLDialogElement;

	let roles: string[] = $derived(data.roles.map(e=>e.name));

	let result: FormResult | undefined = $state();
	let _url: string = $state(data.url);
	let selectedAccess: SelectType|undefined = $derived(getSelectedAccess(data.roles.map(e=>e.name)));
	let _roles: string[]|undefined = $derived(getRoles(selectedAccess?.value))
	
	let disabled: boolean = $derived(
		(selectedAccess?.value == getSelectedAccess(roles)?.value) && _url == data.url
	);
	
	function resetForm() {
		_url=data.url;
		//_type=phoneData.type;
		//selectedType={label: types[phoneData.type],
		//value: phoneData.type};
		selectedAccess=getSelectedAccess(roles);
		result=undefined;
	}
</script>

<button onclick={() => {dialog.showModal();}} title="Modifier"><Fa icon={faPenToSquare} /></button>

<Dialog bind:dialog={dialog} on:close={() => console.log('closed')}>
	<div class="rounded-lg p-4 variant-ghost-secondary gap-2 items-center place-items-center">
		<form
			{...update.enhance(async ({ form, data, submit }) => {
				try {
					//data = manipulateForm(data);
					const dataString = JSON.stringify(Object.fromEntries(data));
					console.log(dataString);
					await submit();
					result=update.result;
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
						<span>Url</span>
						<input
							oninput={() => {}}
							class="input"
							name="url"
							type="url"
							placeholder=""
							bind:value={_url}
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
						<span class="badge-icon variant-filled-error"><Fa icon={faExclamationCircle} /></span>{result.text}
					{/if}
				</div>
				<div class="w-auto justify-center">
					<button type="submit" class="variant-filled-secondary btn w-min" {disabled}
						>Envoyer</button
					>
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

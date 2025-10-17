<script lang="ts">
	import * as m from '$msgs';
	import { updateForm } from '../../../website.remote';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import { invalidate } from '$app/navigation';
	import {
		faCheck,
		faWindowClose,
		faPenToSquare,
		faExclamationCircle,
		faTrashCanArrowUp
	} from '@fortawesome/free-solid-svg-icons';
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

	let dialog: HTMLDialogElement|undefined = $state();

	let roles: string[] = $derived(data.roles.map((e) => e.name));
	let _url: string = $state(data.url);
	let selectedAccess: SelectType | undefined = $derived(
		getSelectedAccess(data.roles.map((e) => e.name))
	);
	let _roles: string[] | undefined = $derived(getRoles(selectedAccess?.value));
	let disabled: boolean = $derived(
		selectedAccess?.value == getSelectedAccess(roles)?.value && _url == data.url
	);
	let uuid: string = $state(crypto.randomUUID());
	function updateUuid() {
		uuid = crypto.randomUUID();
	}
	function resetForm() {
		_url = data.url;
		//_type=phoneData.type;
		//selectedType={label: types[phoneData.type],
		//value: phoneData.type};
		selectedAccess = getSelectedAccess(roles);
	}
</script>

<button
	onclick={() => {
		updateUuid();
		dialog?.showModal();
	}}
	title="Modifier"><Fa icon={faPenToSquare} /></button
>

<Dialog bind:dialog on:close={() => console.log('closed')}>
	<div
		class="rounded-lg space-y-4 p-6 variant-ghost-secondary gap-4 items-center place-items-center w-full"
	>
			<h3 class="h3">{capitalizeFirstLetter(m.WEBSITE())}</h3>

		<form
			{...updateForm.for(uuid).enhance(async ({ form, data, submit }) => {
				try {
					await submit();
					invalidate('entry:now');
				} catch (error) {
					console.log(error);
				}
			})}
		>
			<div class="grid grid-cols-1 gap-6">
				<input
					oninput={() => {}}
					class="hidden"
					name="id"
					type="text"
					placeholder=""
					value={data.id}
				/>
				<label class="label">
					<span>Adresse web</span>
					<input
						oninput={() => {}}
						class="input"
						name="url"
						type="url"
						placeholder=""
						bind:value={_url}
					/>
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

				<div class="flex gap-8">
					<div class="flex gap-2 items-center">
						{#if updateForm.for(uuid).result?.success}
							<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
						{:else if updateForm.for(uuid).result?.success==false}
							<span class="badge-icon variant-filled-error"><Fa icon={faExclamationCircle} /></span
							>{updateForm.result?.text}
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
								dialog?.close();
								resetForm();
							}}
							>{#if updateForm.for(uuid).result?.success}Fermer{:else}Annuler{/if}</button
						>
					</div>
				</div>
			</div>
		</form>
	</div>
</Dialog>
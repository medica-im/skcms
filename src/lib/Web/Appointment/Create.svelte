<script lang="ts">
	import { onMount } from 'svelte';
	import * as m from '$msgs';
	import { createCommand } from '../../../appointment.remote';
	import { invalidate } from '$app/navigation';
	import {
		faPlus,
		faCheck,
		faExclamationCircle,
	} from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import Select from 'svelte-select';
	import Dialog from '../Dialog.svelte';
	import { getEntryUid } from '$lib/components/Directory/context';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import type { ThirdPartyPayer } from '$lib/interfaces/fullEffector.interface';
	import type { FormResult } from '$lib/interfaces/v2/form';

	let res = $state();

	const uid = getEntryUid();

	type SelectPhoneUrlType = { label: string; value: 'url' | 'phone' };
	type SelectLocationType = { label: string; value: 'office' | 'house_call' };

	let dialog: HTMLDialogElement;

	let payers: ThirdPartyPayer[] | undefined = $state();

	let locationChoices: SelectLocationType[] = [
		{ label: 'Domicile', value: 'house_call' },
		{ label: 'Cabinet', value: 'office' }
	];
	let phoneUrlChoices: SelectPhoneUrlType[] = [
		{ label: 'Téléphone', value: 'phone' },
		{ label: 'Site web / app', value: 'url' }
	];
	let result: FormResult | undefined = $state();
	let selectedLocation: SelectLocationType | undefined = $state();
	let selectedPhoneUrl: SelectPhoneUrlType | undefined = $state();
	let url: string | null = $state(null);
	let phone: string | null = $state(null);
	let commandData = $derived({
		entry: uid,
		location: selectedLocation == undefined ? null : selectedLocation.value,
		url: url ? url : null,
		phone: phone ? phone : null
	});
	let disabled: boolean = $derived(!url && !phone);

	onMount(async () => {
		url = null;
		phone = null;
	});
</script>

<button
	onclick={async () => {
		result = undefined;
		selectedLocation = undefined;
		selectedPhoneUrl = undefined;
		url = null;
		phone = null;
		dialog.showModal();
	}}
	class="btn-icon btn-icon-sm variant-ghost-surface"
	title="Créer"><Fa icon={faPlus} /></button
>

<Dialog bind:dialog on:close={() => console.log('closed')}>
	<div class="rounded-lg h-min-96 w-96 p-4 variant-ghost-secondary items-center place-items-center">
		<!--div class="text-wrap p-2">
		<p class="text-sm">{JSON.stringify(selectedLocation?.value)}</p>
		<div class="wrap">
		<JsonView json={commandData} />
		</div>
		</div-->
		<div class="grid grid-cols-1 gap-6 w-full">
			<h3 class="h3">{m.APPOINTMENT()}</h3>
			<label class="label">
				<span>Lieu</span>
				<Select items={locationChoices} bind:value={selectedLocation} />
			</label>
			<label class="label">
				<span>Méthode</span>
				<Select items={phoneUrlChoices} bind:value={selectedPhoneUrl} />
			</label>
			{#if selectedPhoneUrl?.value == 'url'}
				<label class="label">
					<span>{capitalizeFirstLetter(m.WEB_ADDRESS())}</span>
					<input
						oninput={() => {}}
						class="input"
						name="url"
						type="url"
						placeholder="https://"
						bind:value={url}
					/>
				</label>
			{:else if selectedPhoneUrl?.value == 'phone'}
				<label class="label">
					<span>{capitalizeFirstLetter(m.PHONE())}</span>
					<input
						oninput={() => {}}
						class="input"
						name="phone"
						type="text"
						placeholder=""
						bind:value={phone}
					/>
				</label>
			{/if}
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
									result = await createCommand(commandData);
									if (result?.success) {
										disabled = true;
										invalidate('entry:now');
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

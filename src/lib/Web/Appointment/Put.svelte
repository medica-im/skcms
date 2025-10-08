<script lang="ts">
	import { onMount } from 'svelte';
	import * as m from '$msgs';
	import { putCommand } from '../../../appointment.remote';
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
	import { JsonView } from '@zerodevx/svelte-json-view';
	import type { Email } from '$lib/interfaces/email.interface.ts';
	import Select from 'svelte-select';
	import Dialog from '../Dialog.svelte';
	import { getEntryUid } from '$lib/components/Directory/context';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import type { ThirdPartyPayer } from '$lib/interfaces/fullEffector.interface';
	import type { FormResult } from '$lib/interfaces/v2/form';
	import type { Appointment } from '$lib/interfaces/appointment.interface';

	let {
		data
	}: {
		data: Appointment;
	} = $props();

	const entryUid = getEntryUid();

	type SelectPhoneUrlType = { label: string; value: 'url'|'phone' };
	type SelectLocationType = { label: string; value: 'office'|'house_call' };


	let dialog: HTMLDialogElement;

	let payers: ThirdPartyPayer[] | undefined = $state();

	let locationChoices: SelectLocationType[] = [
		{ label: "Domicile", value: "house_call" },
		{ label: "Cabinet", value: "office"}
];
	let phoneUrlChoices: SelectPhoneUrlType[] = [
		{ label: "Téléphone", value: "phone" },
		{ label: "Site web / app", value: "url"}
];
	let result: FormResult | undefined = $state();
	let selectedLocation: SelectLocationType | undefined = $state();
	let selectedPhoneUrl: SelectPhoneUrlType | undefined = $state();
	let url: string|null = $state(null);
	let phone: string|null = $state(null);
	let commandData = $derived({
		'uid': data.uid,
		'entry': entryUid,
		'location': selectedLocation == undefined ? null : selectedLocation.value,
		'url': url ? url : null,
		'phone': phone ? phone : null
	});
	let disabled: boolean = $derived(url==data.url && phone==data.phone && selectedLocation?.value==data.location);

	const setValues = ()=>{
		url=data.url;
		phone=data.phone;
		selectedLocation = locationChoices.find(e=>e.value==data.location);
		selectedPhoneUrl = phoneUrlChoices.find((e)=>{
			if ( data.url ) {
				return e.value == 'url'
			} else if ( data.phone ) {
				return e.value == 'phone'
			}
		});
	}

	onMount(async () => {
		setValues();
	});

	function handle(e) {
        console.log(e.detail);
		if (e.detail.value == 'phone') {
			console.log('phone selected: clear url')
			url=null
		} else if (e.detail.value == 'url') {
			console.log('url selected: clear phone')
			phone=null
		}
    }
</script>

<button
	onclick={async () => {
		result = undefined;
		setValues();
		dialog.showModal();
	}}
	class=""
	title="Modifier"><Fa icon={faPenToSquare} /></button
>

<Dialog bind:dialog on:close={() => console.log('closed')}>
	<div class="rounded-lg h-96 w-96 p-4 variant-ghost-secondary items-center place-items-center">
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
			<Select items={phoneUrlChoices} bind:value={selectedPhoneUrl} on:change={handle} />
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
									result = await putCommand(commandData);
									if (result?.success) {
										disabled=true;
									}
									console.log(JSON.stringify(result));
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
<script lang="ts">
	import * as m from '$msgs';
	import { deletePhone } from '../../../phone.remote';
	import { invalidate } from '$app/navigation';
	import {
		faCheck,
		faWindowClose,
		faPenToSquare,
		faExclamationCircle,
		faTrashCanArrowUp,
		faTriangleExclamation
	} from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import Select from 'svelte-select';
	import Dialog from '../Dialog.svelte';
	import Phone from '$lib/Directory/Phone.svelte';
	import type { SelectType } from '$lib/interfaces/select.ts';
	import type { FormResult } from '$lib/interfaces/v2/form';
	import type { Phone as PhoneType } from '$lib/interfaces/phone.interface.ts';

	let {
		phoneData
	}: {
		phoneData: PhoneType;
	} = $props();

	let dialog: HTMLDialogElement;

	let result: FormResult | undefined = $state();

	let _id: number = $state(phoneData.id);
</script>

<button onclick={() => dialog.showModal()} title="Supprimer"><Fa icon={faTrashCanArrowUp} /></button
>

<Dialog bind:dialog on:close={() => console.log('closed')}>
	<div class="rounded-lg h-96 p-4 variant-ghost-secondary gap-4 items-center place-items-center">
		<form
			{...deletePhone.enhance(async ({ form, data, submit }) => {
				try {
					//data = manipulateForm(data);
					const dataString = JSON.stringify(Object.fromEntries(data));
					console.log(dataString);
					await submit();
					result = deletePhone.result;
					invalidate('entry:now');
				} catch (error) {
					console.log(error);
				}
			})}
		>
			<input
				oninput={() => {}}
				class="input hidden"
				name="id"
				type="text"
				placeholder=""
				value={phoneData.id}
			/>
			<div class="p-2 space-y-4 justify-items-stretch gap-6">
				<Phone {phoneData} editMode={false} />
				<div class="flex space-x-2 place-items-center">
					<Fa icon={faTriangleExclamation} />
					<p>Êtes-vous sûr de vouloir supprimer cet élément?</p>
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
						<button type="submit" class="variant-filled-warning btn w-min">Confirmer</button>
					</div>

					<div class="w-auto justify-center">
						<button
							type="button"
							class="variant-filled-{result?.success ? 'success' : 'error'} btn w-min"
							onclick={() => {
								dialog.close();
							}}
							>{#if result?.success}Fermer{:else}Annuler{/if}</button
						>
					</div>
				</div>
			</div>
		</form>
	</div>
</Dialog>

<script lang="ts">
	import * as m from '$msgs';
	import { deleteCommand } from '../../../appointment.remote';
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
	import type { Email } from '$lib/interfaces/email.interface.ts';
	import Select from 'svelte-select';
	import Dialog from '$lib/Web/Dialog.svelte';
	import { getEntryUid } from '$lib/components/Directory/context';
	import Payment from '$lib/Addressbook/Payment/Payment.svelte';
	import type { SelectType } from '$lib/interfaces/select.ts';
	import type { FormResult } from '$lib/interfaces/v2/form';
	import type { Appointment } from '$lib/interfaces/appointment.interface';
	import Appntmnt from '$lib/components/Effector/Appointment/Appointment.svelte';

	let {
		data
	}: {
		data: Appointment;
	} = $props();

	let dialog: HTMLDialogElement|undefined = $state();

	let result: FormResult | undefined = $state();
	let commandData = {
		uid: data.uid
	};
	let disabled: boolean = $state(false);
	let visibility: string = $state("visible");
</script>

<button
	onclick={() => {
		result = undefined;
		disabled = false;
		visibility = "visible";
		dialog?.showModal();
	}}
	title="Supprimer"><Fa icon={faTrashCanArrowUp} /></button
>

<Dialog bind:dialog>
	<div class="rounded-lg h-64 p-8 variant-ghost-secondary gap-8 items-center place-items-center">
		<div class="grid grid-cols-1 gap-4">
			<h3 class="h3">{m.APPOINTMENT()}</h3>
			{#if data.location == 'house_call'}
				<p class="{visibility}">Domicile</p>
			{:else if data.location}
				<p class="{visibility}">Cabinet</p>
			{/if}
			<div class="{visibility}">
			<Appntmnt data={data} editMode={false} />
			</div>
			<div class="flex space-x-2 place-items-center {visibility}">
				<Fa icon={faTriangleExclamation} />
				<p>Êtes-vous sûr de vouloir supprimer cet élément?</p>
			</div>
			<div class="flex flex-wrap gap-4 justify-end">
				<div class="flex gap-2 items-center">
					{#if result?.success}
						<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
					{:else if result && !result?.success}
						<span class="badge-icon variant-filled-error"><Fa icon={faExclamationCircle} /></span
						>{result.text}
					{/if}
				</div>
				<button
					onclick={async () => {
						try {
							result = await deleteCommand(commandData);
							if (result.success) {
								disabled=true;
								visibility="invisible";
								invalidate('entry:now');
							}
						} catch (error) {
							console.error(error);
						}
					}}
					type="submit"
					class="variant-filled-warning btn w-min"
					{disabled}>Supprimer</button
				>
				<button
					type="button"
					class="variant-filled-error btn w-min"
					onclick={() => {
						dialog?.close();
						result=undefined;
					}}
					>{#if result?.success}Fermer{:else}Annuler{/if}</button
				>
			</div>
		</div>
	</div>
</Dialog>
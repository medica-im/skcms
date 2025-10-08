<script lang="ts">
	import * as m from '$msgs';
	import { patchCommand } from '../../../../entry.remote';
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
	import Dialog from '../../Dialog.svelte';
	import { getEntryUid } from '$lib/components/Directory/context';
	import Payment from '$lib/Addressbook/Payment/Payment.svelte';
	import type { SelectType } from '$lib/interfaces/select.ts';
	import type { FormResult } from '$lib/interfaces/v2/form';
	import type { PaymentMethod } from '$lib/interfaces/fullEffector.interface';

	let {
		data
	}: {
		data: PaymentMethod[] | null;
	} = $props();

	let res = $state();

	const uid = getEntryUid();

	let dialog: HTMLDialogElement;

	let result: FormResult | undefined = $state();
	let commandData = {
		entry: uid,
		third_party_payer: null
	};
</script>

<button
	onclick={() => {
		result = undefined;
		dialog.showModal();
	}}
	title="Supprimer"><Fa icon={faTrashCanArrowUp} /></button
>

<Dialog bind:dialog on:close={() => console.log('closed')}>
	<div class="rounded-lg h-64 p-8 variant-ghost-secondary gap-8 items-center place-items-center">
		<!--button
			id="close"
			aria-label={m.CLOSE()}
			onclick={() => dialog.close()}
			class="btn variant-ringed"
			formnovalidate><Fa icon={faWindowClose} /></button
		-->
		<div class="grid grid-cols-1 gap-4">
			<!--h3 class="h3">Carte vitale</h3-->
			<Payment {data} />
			<div class="flex space-x-2 place-items-center">
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
							result = await patchCommand(commandData);
							console.log(JSON.stringify(res));
							invalidate('entry:now');
						} catch (error) {
							console.error(error);
						}
					}}
					type="submit"
					class="variant-filled-warning btn w-min">Supprimer</button
				>
				<button
					type="button"
					class="variant-filled-error btn w-min"
					onclick={() => {
						dialog.close();
					}}
					>{#if result?.success}Fermer{:else}Annuler{/if}</button
				>
			</div>
		</div>
	</div>
</Dialog>

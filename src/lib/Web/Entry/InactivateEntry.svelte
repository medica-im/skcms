<script lang="ts">
	import * as m from '$msgs';
	import { patchCommand } from '../../../entry.remote';
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
	import Dialog from '../Dialog.svelte';
	import { getEntryUid } from '$lib/components/Directory/context';
	import Convention from '$lib/components/Effector/Cost/Convention.svelte';
	import type { FormResult } from '$lib/interfaces/v2/form';

	let res = $state();

	const uid = getEntryUid();

	let dialog: HTMLDialogElement|undefined = $state();

	let result: FormResult | undefined = $state();
	let commandData = {
		entry: uid,
		active: false
	};
</script>

<button
	onclick={() => {
		result = undefined;
		dialog?.showModal();
	}}
	title="Supprimer" class="btn variant-filled-error"><span><Fa icon={faTrashCanArrowUp} /></span><span>Supprimer l'entrée</span></button
>

<Dialog bind:dialog on:close={() => console.log('closed')}>
	<div class="rounded-lg h-96 w-96 p-6 variant-ghost-secondary gap-6 items-center place-items-center">
		<!--button
			id="close"
			aria-label={m.CLOSE()}
			onclick={() => dialog.close()}
			class="btn variant-ringed"
			formnovalidate><Fa icon={faWindowClose} /></button
		-->
		<div class="grid grid-cols-1 gap-4">
			<div class="place-items-center">
			<h3 class="h3">Suppression</h3>
			</div>
			<div class="flex space-x-2 place-items-center">
				<Fa icon={faTriangleExclamation} />
				<p>Supprimer cette entrée de l'annuaire?</p>
			</div>
			<div>
				<p>La fiche n'apparaîtra plus dans l'annuaire. Sa suppression n'entraîne pas la suppression de la personne ou de l'établissement. Les coordonnées sont également conservées. Vous pourrez recréer rapidement l'entrée en sélectionnant la même personne, la même catégorie et le même établissement dans l'interface de création.</p>
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
					class="variant-filled-error btn w-min">Supprimer</button
				>
				<button
					type="button"
					class="variant-filled-success btn w-min"
					onclick={() => {
						dialog?.close();
					}}
					>{#if result?.success}Fermer{:else}Annuler{/if}</button
				>
			</div>
		</div>
	</div>
</Dialog>

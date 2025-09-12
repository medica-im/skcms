<script lang="ts">
	import * as m from '$msgs';
	import { patchCommand } from '../../../effector.remote';
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
	import { getEffectorUid } from '$lib/components/Directory/context';
	import type { SelectType } from '$lib/interfaces/select.ts';
	import type { FormResult } from '$lib/interfaces/v2/form';
	import type { EntryFull } from '$lib/store/directoryStoreInterface';

	let {
		data
	}: {
		data: EntryFull;
	} = $props();

	let dialog: HTMLDialogElement | undefined = $state();
	const effectorUid = getEffectorUid();
	let result: FormResult | undefined = $state();
	let commandData = {
		effector: effectorUid,
		rpps: null
	};
</script>

<button
	onclick={() => {
		result = undefined;
		dialog?.showModal();
	}}
	title="Supprimer"><Fa icon={faTrashCanArrowUp} /></button
>

<Dialog bind:dialog>
	<div class="rounded-lg h-64 p-8 variant-ghost-secondary gap-8 items-center place-items-center">
		<div class="grid grid-cols-1 gap-4">
			<h3 class="h3">RPPS</h3>
			<div>
				N° RPPS: {data.rpps || '∅'}
			</div>
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
							if (result.success) {
								invalidate('entry:now');
							}
						} catch (error) {
							console.error(`error:${error}`);
						}
					}}
					type="submit"
					class="variant-filled-warning btn w-min">Supprimer</button
				>
				<button
					type="button"
					class="variant-filled-error btn w-min"
					onclick={() => {
						dialog?.close();
						result = undefined;
					}}
					>{#if result?.success}Fermer{:else}Annuler{/if}</button
				>
			</div>
		</div>
	</div>
</Dialog>
<script lang="ts">
	import * as m from '$msgs';
	import { patchCommand } from '../../../effector.remote';
	import { invalidate } from '$app/navigation';
	import {
		faCheck,
		faExclamationCircle,
		faTrashCanArrowUp,
		faTriangleExclamation
	} from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import Dialog from '$lib/Web/Dialog.svelte';
	import { getEffectorUid } from '$lib/components/Directory/context';
	import Languages from '$lib/components/Effector/Info/Languages.svelte';
	import type { FormResult } from '$lib/interfaces/v2/form';
	import type { SpokenLanguage } from "$lib/interfaces/fullEffector.interface";

	let {
		data
	}: {
		data: SpokenLanguage[] | null;
	} = $props();

	const uid = getEffectorUid();
	let dialog: HTMLDialogElement|undefined = $state();
	let result: FormResult | undefined = $state();
	let commandData = $derived({
		effector: uid,
		spoken_languages: null
	});
</script>

<button
	onclick={() => {
		result = undefined;
		dialog?.showModal();
	}}
	title={'Supprimer'}><Fa icon={faTrashCanArrowUp} /></button
>

<Dialog bind:dialog on:close={() => console.log('closed')}>
	<div class="rounded-lg h-52 p-8 variant-ghost-secondary gap-8 items-center place-items-center">
		<div class="grid grid-cols-1 gap-4">
			<h3 class="h3">Langues</h3>
			<Languages data={data}/>
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
							console.log(JSON.stringify(result));
							invalidate('entry:now');
						} catch (error) {
							console.error(error);
						}
					}}
					type="submit"
					class="variant-filled-warning btn w-min"
					>Supprimer</button
				>
				<button
					type="button"
					class="variant-filled-error btn w-min"
					onclick={() => {
						dialog?.close();
					}}
					>{#if result?.success}Fermer{:else}Annuler{/if}</button
				>
			</div>
		</div>
	</div>
</Dialog>

<script lang="ts">
	import * as m from '$msgs';
	import { deleteOfficer } from '../../../association.remote';
	import { invalidate } from '$app/navigation';
	import { faCheck, faExclamationCircle, faTrash, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import Dialog from '../Dialog.svelte';
	import type { Officer } from '$lib/interfaces/v2/association';

	let {
		officer
	}: {
		officer: Officer;
	} = $props();

	let dialog: HTMLDialogElement;
	let result = $state(deleteOfficer.for(officer.uid).result);
	let disabled: boolean = $derived(!!deleteOfficer.for(officer.uid).pending || result?.success === true);
</script>

<button
	class="btn-icon btn-icon-sm variant-ghost-error"
	onclick={() => dialog.showModal()}
	title={m.OFFICER_DELETE()}
><Fa icon={faTrash} /></button>

<Dialog bind:dialog>
	<div class="rounded-lg p-4 variant-ghost-secondary space-y-4">
		<form
			{...deleteOfficer.for(officer.uid).enhance(async ({ submit }) => {
				try {
					await submit();
					invalidate('association:data');
				} catch (error) {
					console.error(error);
				}
			})}
		>
			<input class="hidden" name="uid" type="text" value={officer.uid} />
			<div class="space-y-4">
				<div class="flex items-start gap-2 max-w-prose">
					<Fa icon={faTriangleExclamation} class="mt-1 shrink-0" />
					<div class="space-y-2">
						<p>Êtes-vous sûr de vouloir supprimer définitivement ce membre du bureau? Cette action est irréversible.</p>
						<p>Pour indiquer qu'une personne ne fait plus partie du bureau, il faut simplement indiquer une date de fin de mandat en cliquant sur le bouton "Modifier le membre du bureau".</p>
					</div>
				</div>

				<div class="flex gap-4 items-center">
					{#if result?.success}
						<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
					{:else if result && !result?.success}
						<span class="badge-icon variant-filled-error"><Fa icon={faExclamationCircle} /></span>
						<span class="text-sm">{result?.response?.detail || result?.text}</span>
					{/if}
					{#if !result?.success}
						<button type="submit" class="variant-filled-warning btn" {disabled}>{m.OFFICER_DELETE()}</button>
					{/if}
					<button
						type="button"
						class="variant-filled-{result?.success ? 'success' : 'error'} btn"
						onclick={() => dialog.close()}
					>{#if result?.success}{m.CLOSE()}{:else}{m.CANCEL()}{/if}</button>
				</div>
			</div>
		</form>
	</div>
</Dialog>

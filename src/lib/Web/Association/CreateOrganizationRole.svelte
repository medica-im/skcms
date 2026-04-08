<script lang="ts">
	import * as m from '$msgs';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import { createOrganizationRole } from '../../../association.remote';
	import { invalidate } from '$app/navigation';
	import { faCheck, faExclamationCircle, faPlus } from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import Dialog from '../Dialog.svelte';

	let dialog: HTMLDialogElement;
	let label: string = $state('');
	let result = $derived(createOrganizationRole.result);
	let disabled: boolean = $derived(!!createOrganizationRole.pending || label.trim() === '' || result?.success === true);

	function resetForm() {
		label = '';
		result = undefined;
	}
</script>

<button
	class="btn-icon btn-icon-sm variant-ghost-surface"
	onclick={() => {
		resetForm();
		dialog.showModal();
	}}
	title={m.ORG_ROLE_CREATE()}
><Fa icon={faPlus} /></button>

<Dialog bind:dialog>
	<div class="rounded-lg p-4 variant-ghost-secondary space-y-4">
		<h3 class="h3">{capitalizeFirstLetter(m.ORG_ROLE_CREATE())}</h3>
		<form
			{...createOrganizationRole.enhance(async ({ submit }) => {
				try {
					await submit();
					invalidate('association:data');
				} catch (error) {
					console.error(error);
				}
			})}
		>
			<div class="space-y-4">
				<label class="label">
					<span>{m.COL_LABEL()}</span>
					{#each createOrganizationRole.fields.label.issues() as issue}
						<p class="text-error-500 text-sm">{issue.message}</p>
					{/each}
					<input
						oninput={() => {}}
						class="input"
						name="label"
						type="text"
						placeholder=""
						bind:value={label}
					/>
				</label>
				<div class="flex gap-4 items-center">
					{#if result?.success}
						<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
					{:else if result && !result?.success}
						<span class="badge-icon variant-filled-error"><Fa icon={faExclamationCircle} /></span>
						<span class="text-sm">{result?.response?.detail || result?.text}</span>
					{/if}
					<button type="submit" class="variant-filled-secondary btn" {disabled}>{m.ORG_ROLE_CREATE()}</button>
					<button
						type="button"
						class="variant-filled-error btn"
						onclick={() => {
							dialog.close();
							resetForm();
						}}
					>{#if result?.success}{m.CLOSE()}{:else}{m.CANCEL()}{/if}</button>
				</div>
			</div>
		</form>
	</div>
</Dialog>

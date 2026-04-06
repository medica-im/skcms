<script lang="ts">
	import * as m from '$msgs';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import { updateOrganizationRole } from '../../../association.remote';
	import { invalidate } from '$app/navigation';
	import { faCheck, faExclamationCircle, faPenToSquare } from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import Dialog from '../Dialog.svelte';
	import type { OrganizationRole } from '$lib/interfaces/v2/association';

	let {
		role
	}: {
		role: OrganizationRole;
	} = $props();

	let dialog: HTMLDialogElement | undefined = $state();
	let label: string = $state(role.label);
	let uuid: string = $state(crypto.randomUUID());
	const initial = { label: role.label };
	let hasChanges = $derived(label !== initial.label);
	let disabled: boolean = $derived(
		!!updateOrganizationRole.for(uuid).pending || !hasChanges || label.trim() === ''
	);

	function updateUuid() {
		uuid = crypto.randomUUID();
	}

	function resetForm() {
		label = role.label;
	}
</script>

<button
	class="btn-icon btn-icon-sm variant-ghost-secondary"
	onclick={() => {
		updateUuid();
		dialog?.showModal();
	}}
	title={m.ORG_ROLE_UPDATE()}
><Fa icon={faPenToSquare} /></button>

<Dialog bind:dialog>
	<div class="rounded-lg p-4 variant-ghost-secondary space-y-4">
		<h3 class="h3">{capitalizeFirstLetter(m.ORG_ROLE_UPDATE())}</h3>
		<form
			{...updateOrganizationRole.for(uuid).enhance(async ({ submit }) => {
				try {
					await submit();
					invalidate('entry:now');
				} catch (error) {
					console.error(error);
				}
			})}
		>
			<div class="space-y-4">
				<input class="hidden" name="uid" type="text" value={role.uid} />
				<label class="label">
					<span>{m.COL_LABEL()}</span>
					{#each updateOrganizationRole.for(uuid).fields.label.issues() as issue}
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
					{#if updateOrganizationRole.for(uuid).result?.success}
						<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
					{:else if updateOrganizationRole.for(uuid).result?.success === false}
						<span class="badge-icon variant-filled-error"><Fa icon={faExclamationCircle} /></span>
						<span class="text-sm">{updateOrganizationRole.for(uuid).result?.response?.detail || updateOrganizationRole.for(uuid).result?.text}</span>
					{/if}
					<button type="submit" class="variant-filled-secondary btn" {disabled}>{m.ORG_ROLE_UPDATE()}</button>
					<button
						type="button"
						class="variant-filled-error btn"
						onclick={() => {
							dialog?.close();
							resetForm();
						}}
					>{#if updateOrganizationRole.for(uuid).result?.success}{m.CLOSE()}{:else}{m.CANCEL()}{/if}</button>
				</div>
			</div>
		</form>
	</div>
</Dialog>

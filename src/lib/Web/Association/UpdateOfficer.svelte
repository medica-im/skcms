<script lang="ts">
	import * as m from '$msgs';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import { updateOfficer } from '../../../association.remote';
	import { invalidate } from '$app/navigation';
	import { faCheck, faExclamationCircle, faPenToSquare } from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import Dialog from '../Dialog.svelte';
	import type { Officer, OrganizationRole } from '$lib/interfaces/v2/association';

	let {
		officer,
		organizationRoles
	}: {
		officer: Officer;
		organizationRoles: OrganizationRole[];
	} = $props();

	let dialog: HTMLDialogElement | undefined = $state();
	let roleLabel: string = $state(officer.role_label || '');
	let start: string = $state(officer.start);
	let stop: string = $state(officer.stop || '');
	let uuid: string = $state(crypto.randomUUID());
	const initial = {
		roleLabel: officer.role_label || '',
		start: officer.start,
		stop: officer.stop || ''
	};
	let hasChanges = $derived(
		roleLabel !== initial.roleLabel || start !== initial.start || stop !== initial.stop
	);
	let disabled: boolean = $derived(
		!!updateOfficer.for(uuid).pending || !hasChanges
	);

	function updateUuid() {
		uuid = crypto.randomUUID();
	}

	function resetForm() {
		roleLabel = officer.role_label || '';
		start = officer.start;
		stop = officer.stop || '';
	}
</script>

<button
	class="btn-icon btn-icon-sm variant-ghost-secondary"
	onclick={() => {
		updateUuid();
		dialog?.showModal();
	}}
	title={m.OFFICER_UPDATE()}
><Fa icon={faPenToSquare} /></button>

<Dialog bind:dialog>
	<div class="rounded-lg p-4 variant-ghost-secondary space-y-4">
		<h3 class="h3">{capitalizeFirstLetter(m.OFFICER_UPDATE())}</h3>
		<form
			{...updateOfficer.for(uuid).enhance(async ({ submit }) => {
				try {
					await submit();
					invalidate('association:data');
				} catch (error) {
					console.error(error);
				}
			})}
		>
			<div class="space-y-4">
				<input class="hidden" name="uid" type="text" value={officer.uid} />

				<label class="label">
					<span>{m.ROLE_LABEL()}</span>
					<input
						oninput={() => {}}
						class="input"
						name="role_label"
						type="text"
						placeholder=""
						bind:value={roleLabel}
					/>
				</label>

				<label class="label">
					<span>{m.COL_START()}</span>
					<input
						oninput={() => {}}
						class="input"
						name="start"
						type="date"
						bind:value={start}
					/>
				</label>

				<label class="label">
					<span>{m.COL_STOP()}</span>
					<input
						oninput={() => {}}
						class="input"
						name="stop"
						type="date"
						bind:value={stop}
					/>
				</label>

				<div class="flex gap-4 items-center">
					{#if updateOfficer.for(uuid).result?.success}
						<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
					{:else if updateOfficer.for(uuid).result?.success === false}
						<span class="badge-icon variant-filled-error"><Fa icon={faExclamationCircle} /></span>
						<span class="text-sm">{updateOfficer.for(uuid).result?.response?.detail || updateOfficer.for(uuid).result?.text}</span>
					{/if}
					<button type="submit" class="variant-filled-secondary btn" {disabled}>{m.OFFICER_UPDATE()}</button>
					<button
						type="button"
						class="variant-filled-error btn"
						onclick={() => {
							dialog?.close();
							resetForm();
						}}
					>{#if updateOfficer.for(uuid).result?.success}{m.CLOSE()}{:else}{m.CANCEL()}{/if}</button>
				</div>
			</div>
		</form>
	</div>
</Dialog>

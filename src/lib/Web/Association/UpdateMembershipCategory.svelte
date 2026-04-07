<script lang="ts">
	import * as m from '$msgs';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import { updateMembershipCategory } from '../../../association.remote';
	import { invalidate } from '$app/navigation';
	import { faCheck, faExclamationCircle, faPenToSquare } from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import Dialog from '../Dialog.svelte';
	import type { MembershipCategory } from '$lib/interfaces/v2/association';

	let {
		category
	}: {
		category: MembershipCategory;
	} = $props();

	let dialog: HTMLDialogElement | undefined = $state();
	let label: string = $state(category.label);
	let uuid: string = $state(crypto.randomUUID());
	const initial = { label: category.label };
	let hasChanges = $derived(label !== initial.label);
	let disabled: boolean = $derived(
		!!updateMembershipCategory.for(uuid).pending || !hasChanges || label.trim() === ''
	);

	function updateUuid() {
		uuid = crypto.randomUUID();
	}

	function resetForm() {
		label = category.label;
	}
</script>

<button
	class="btn-icon btn-icon-sm variant-ghost-secondary"
	onclick={() => {
		updateUuid();
		dialog?.showModal();
	}}
	title={m.MEMBERSHIP_CATEGORY_UPDATE()}
><Fa icon={faPenToSquare} /></button>

<Dialog bind:dialog>
	<div class="rounded-lg p-4 variant-ghost-secondary space-y-4">
		<h3 class="h3">{capitalizeFirstLetter(m.MEMBERSHIP_CATEGORY_UPDATE())}</h3>
		<form
			{...updateMembershipCategory.for(uuid).enhance(async ({ submit }) => {
				try {
					await submit();
					invalidate('association:data');
				} catch (error) {
					console.error(error);
				}
			})}
		>
			<div class="space-y-4">
				<input class="hidden" name="uid" type="text" value={category.uid} />
				<label class="label">
					<span>{m.COL_LABEL()}</span>
					{#each updateMembershipCategory.for(uuid).fields.label.issues() as issue}
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
					{#if updateMembershipCategory.for(uuid).result?.success}
						<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
					{:else if updateMembershipCategory.for(uuid).result?.success === false}
						<span class="badge-icon variant-filled-error"><Fa icon={faExclamationCircle} /></span>
						<span class="text-sm">{updateMembershipCategory.for(uuid).result?.response?.detail || updateMembershipCategory.for(uuid).result?.text}</span>
					{/if}
					<button type="submit" class="variant-filled-secondary btn" {disabled}>{m.MEMBERSHIP_CATEGORY_UPDATE()}</button>
					<button
						type="button"
						class="variant-filled-error btn"
						onclick={() => {
							dialog?.close();
							resetForm();
						}}
					>{#if updateMembershipCategory.for(uuid).result?.success}{m.CLOSE()}{:else}{m.CANCEL()}{/if}</button>
				</div>
			</div>
		</form>
	</div>
</Dialog>

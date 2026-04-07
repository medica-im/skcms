<script lang="ts">
	import * as m from '$msgs';
	import { deleteMembershipCategory } from '../../../association.remote';
	import { invalidate } from '$app/navigation';
	import { faCheck, faExclamationCircle, faTrash, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import Dialog from '../Dialog.svelte';
	import type { MembershipCategory } from '$lib/interfaces/v2/association';

	let {
		category
	}: {
		category: MembershipCategory;
	} = $props();

	let dialog: HTMLDialogElement;
	let result = $state(deleteMembershipCategory.for(category.uid).result);
	let isConflict = $derived(result?.status === 409);
</script>

<button
	class="btn-icon btn-icon-sm variant-ghost-error"
	onclick={() => dialog.showModal()}
	title={m.MEMBERSHIP_CATEGORY_DELETE()}
><Fa icon={faTrash} /></button>

<Dialog bind:dialog>
	<div class="rounded-lg p-4 variant-ghost-secondary space-y-4">
		<form
			{...deleteMembershipCategory.for(category.uid).enhance(async ({ submit }) => {
				try {
					await submit();
					invalidate('association:data');
				} catch (error) {
					console.error(error);
				}
			})}
		>
			<input class="hidden" name="uid" type="text" value={category.uid} />
			<div class="space-y-4">
				<p class="font-medium">{category.label}</p>
				<div class="flex items-center gap-2">
					<Fa icon={faTriangleExclamation} />
					<p>{m.MEMBERSHIP_CATEGORY_DELETE_CONFIRM()}</p>
				</div>
				<div class="flex gap-4 items-center">
					{#if result?.success}
						<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
					{:else if result && !result?.success}
						<span class="badge-icon variant-filled-error"><Fa icon={faExclamationCircle} /></span>
						<span class="text-sm">
							{#if isConflict}
								{m.MEMBERSHIP_CATEGORY_DELETE_CONFLICT()}
							{:else}
								{result?.response?.detail || result?.text}
							{/if}
						</span>
					{/if}
					{#if !result?.success && !isConflict}
						<button type="submit" class="variant-filled-warning btn">{m.MEMBERSHIP_CATEGORY_DELETE()}</button>
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

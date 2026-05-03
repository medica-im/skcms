<script lang="ts">
	import { page } from '$app/state';
	import { invalidate } from '$app/navigation';
	import { patchCommand } from '../../../entry.remote';
	import { getEntryUid } from '$lib/components/Directory/context';
	import Dialog from '../Dialog.svelte';
	import * as m from '$msgs';
	import Fa from 'svelte-fa';
	import {
		faEye,
		faPenToSquare,
		faCheck,
		faExclamationCircle,
		faSpinner
	} from '@fortawesome/free-solid-svg-icons';
	import type { FormResult } from '$lib/interfaces/v2/form';
	import { allAccessOptions, accessDescriptions } from './access';

	let { access, editMode }: { access: string; editMode: boolean } = $props();

	const uid = getEntryUid();

	const accessOptions = $derived.by(() => {
		const role = page.data?.user?.role;
		if (role === 'superuser') return allAccessOptions;
		if (role === 'administrator') return allAccessOptions.filter(o => o.value !== 'superuser');
		return allAccessOptions.filter(o => o.value === 'anonymous' || o.value === 'staff');
	});

	const accessLabel = $derived(
		allAccessOptions.find(o => o.value === access)?.label ?? access
	);
	const accessDescription = $derived(accessDescriptions[access] ?? '');
	let selectedAccess = $state(access);
	const selectedAccessDescription = $derived(accessDescriptions[selectedAccess] ?? '');

	let dialog: HTMLDialogElement | undefined = $state();
	let result: FormResult | undefined = $state();
	let pending = $state(false);
	let hasChanges = $derived(selectedAccess !== access);

	function openDialog() {
		selectedAccess = access;
		result = undefined;
		pending = false;
		dialog?.showModal();
	}

	async function handleSubmit() {
		pending = true;
		try {
			result = await patchCommand({
				entry: uid,
				access: selectedAccess
			});
			if (result?.success) {
				invalidate('app:entries');
				dialog?.close();
			}
		} catch (error) {
			console.error(error);
		} finally {
			pending = false;
		}
	}
</script>

<div class="d-flex justify-content-between align-items-start">
	<div class="flex items-center py-2">
		<div class="w-9"><Fa icon={faEye} size="sm" /></div>
		<div>
			<h4 class="h4 flex place-items-center gap-1">
				{m['ACCESS.ACCESS_CONTROL']()}
				{#if editMode}
					<button
						onclick={openDialog}
						class="btn-icon btn-icon-sm variant-ghost-surface"
					>
						<Fa icon={faPenToSquare} />
					</button>
				{/if}
			</h4>
		</div>
	</div>
	<div class="flex">
		<div class="w-9"></div>
		<p class="py-2 text-sm">
			<span class="badge variant-ghost-surface">{accessLabel}</span>
			<span class="opacity-70 ml-1">{accessDescription}</span>
		</p>
	</div>
</div>

<Dialog bind:dialog>
	<div class="rounded-lg w-[28rem] max-w-[90vw] p-6 variant-ghost-secondary gap-6 items-center place-items-center">
		<div class="grid grid-cols-1 gap-6">
			<h3 class="h3 text-center">{m['ACCESS.ACCESS_CONTROL']()}</h3>
			<label class="label w-full">
				<select class="select" bind:value={selectedAccess}>
					{#each accessOptions as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</label>
			<p class="text-sm opacity-70">{selectedAccessDescription}</p>
			<div class="flex flex-wrap gap-4 justify-end">
				<div class="flex gap-2 items-center">
					{#if result && !result?.success}
						<span class="badge-icon variant-filled-error"><Fa icon={faExclamationCircle} /></span>
						{result.text}
					{/if}
				</div>
				<button
					onclick={handleSubmit}
					disabled={!hasChanges || pending}
					class="variant-filled-secondary btn w-min"
				>
					{#if pending}
						<Fa icon={faSpinner} spin />
					{:else}
						{m.CONFIRM()}
					{/if}
				</button>
				<button
					type="button"
					class="variant-filled-surface btn w-min"
					disabled={pending}
					onclick={() => dialog?.close()}
				>
					{m.CANCEL()}
				</button>
			</div>
		</div>
	</div>
</Dialog>

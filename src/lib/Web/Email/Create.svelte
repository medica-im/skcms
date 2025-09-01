<script lang="ts">
	import * as m from '$msgs';
	import { createEmail } from '../../../email.remote';
	import { invalidate } from '$app/navigation';
	import {
		faCheck,
		faWindowClose,
		faPenToSquare,
		faExclamationCircle,
		faTrashCanArrowUp,
		faPlus,
		faSquarePlus,
	} from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import type { Email } from '$lib/interfaces/email.interface.ts';
	import Select from 'svelte-select';
	import Dialog from '../Dialog.svelte';
	import { copy } from 'svelte-copy';
	import { page } from '$app/state';
	import { accessSelectTypes, getRoles } from '$lib/Web/access.ts';
	import type { SelectType } from '$lib/interfaces/select.ts';
	import type { FormResult } from '$lib/interfaces/v2/form';

	let {
		entry
	}: {
		entry: string;
	} = $props();

	const isSuperUser = $derived(page.data?.user?.role == 'superuser');

	let dialog: HTMLDialogElement;

	let result: FormResult | undefined = $state();

	

	let _email: string|undefined = $state();
	let selectedAccess: SelectType = $state(accessSelectTypes[0]);
	let _roles: string[]|undefined = $derived(getRoles(selectedAccess.value))
	let disabled: boolean = $derived(
		_email == undefined
	);
	function resetForm() {
		_email = undefined;
		result = undefined;
	}
</script>

<button class="btn-icon btn-icon-sm variant-ghost-surface"
	onclick={() => {
		dialog.showModal();
	}}
	title="Ajouter"><Fa icon={faPlus} /></button
>

<Dialog bind:dialog on:close={() => console.log('closed')}>
	<div class="rounded-lg p-4 variant-ghost-secondary gap-2 items-center place-items-center">
		<button
			id="close"
			aria-label={m.CLOSE()}
			onclick={() => dialog.close()}
			class="btn variant-ringed"
			formnovalidate><Fa icon={faWindowClose} /></button
		>
		<form
			{...createEmail.enhance(async ({ form, data, submit }) => {
				try {
					//data = manipulateForm(data);
					const dataString = JSON.stringify(Object.fromEntries(data));
					console.log(dataString);
					await submit();
					result = createEmail.result;
					invalidate('entry:now');
				} catch (error) {
					console.log(error);
				}
			})}
		>
			<div class="p-2 space-y-4 justify-items-stretch gap-6">
				<div class="p-2 space-y-2 w-full">
					<label class="flex label place-self-start place-items-center space-x-2 w-full">
						<input
							oninput={() => {}}
							class="input hidden"
							name="entry"
							type="text"
							placeholder=""
							bind:value={entry}
						/>
					</label>
					{#if isSuperUser}
						Entry UID: {entry}
						<button type="button" class="btn btn-sm variant-ghost" use:copy={entry}> Copy! </button>
					{/if}
					<label class="flex label place-self-start place-items-center space-x-2 w-full">
						<span>Adresse électronique</span>
						<input
							oninput={() => {}}
							class="input"
							name="email"
							type="email"
							placeholder=""
							bind:value={_email}
						/>
					</label>
<label class="flex label place-self-start place-items-center space-x-2 w-full">
						<span>Accès:</span>
						<input
							oninput={() => {}}
							class="input hidden"
							name="roles"
							type="text"
							placeholder=""
							bind:value={_roles}
						/>
						<Select items={accessSelectTypes} bind:value={selectedAccess} />
					</label>
				</div>
			</div>
			<div class="flex gap-8">
				<div class="w-auto justify-center">
					<button type="submit" class="variant-filled-secondary btn w-min" {disabled}
						>Créer</button
					>
				</div>
				<div class="flex gap-2 items-center">
					{#if result?.success}
						<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
					{:else if result && !result?.success}
						<span class="badge-icon variant-filled-error"><Fa icon={faExclamationCircle} /></span
						>{result.text}
					{/if}
				</div>
				<div class="w-auto justify-center">
					<button
						type="button"
						class="variant-filled-error btn w-min"
						onclick={() => {
							dialog.close();
							resetForm();
						}}
						>{#if result?.success || disabled}Fermer{:else}Annuler{/if}</button
					>
				</div>
			</div>
		</form>
	</div>
</Dialog>

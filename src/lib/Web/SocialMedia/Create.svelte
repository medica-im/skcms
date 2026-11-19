<script lang="ts">
	import { onMount } from 'svelte';
	import * as m from '$msgs';
	import { create } from '../../../socialmedia.remote';
	import { invalidate } from '$app/navigation';
	import {
		faCheck,
		faWindowClose,
		faPenToSquare,
		faExclamationCircle,
		faTrashCanArrowUp,
		faPlus,
		faSquarePlus
	} from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import Select from '#lib/Web/Select.svelte';
	import Dialog from '../Dialog.svelte';
	import { page } from '$app/state';
	import { accessSelectTypes, getRoles } from '#lib/Web/access.ts';
	import type { SelectType } from '#lib/interfaces/select.ts';
	import { capitalizeFirstLetter } from '#lib/helpers/stringHelpers.ts';
	import { getSomedTypes } from './fetch.ts';

	let {
		entry
	}: {
		entry: string;
	} = $props();
	
	let somedTypesItems: SelectType[]|undefined = $state();
	const isSuperUser = $derived(page.data?.user?.role == 'superuser');
	let dialog: HTMLDialogElement|undefined = $state();
	let _url: string | undefined = $state();
	let selectedAccess: SelectType | undefined = $state(accessSelectTypes[0]);
	let selectedType: SelectType | undefined = $state();
	let _roles: string[] | undefined = $derived(getRoles(selectedAccess?.value));
	let _type: string | undefined = $derived(selectedType?.value);

	let result = $derived(create.result);
	let disabled: boolean = $derived(!!create.pending || _url == undefined || selectedAccess==undefined || result?.success==true);
	function resetForm() {
		_url = undefined;
		result = undefined;
		selectedAccess = accessSelectTypes[0];
	}
	onMount(async () => {
		somedTypesItems = await getSomedTypes();
	});
</script>

<button
	class="btn-icon btn-icon-sm variant-ghost-surface"
	onclick={() => {
		resetForm();
		dialog?.showModal();
	}}
	title="Ajouter"><Fa icon={faPlus} /></button
>

<Dialog bind:dialog on:close={() => console.log('closed')}>
	<div class="rounded-lg p-4 variant-ghost-secondary gap-2 items-center place-items-center">
		<h3 class="h3">{capitalizeFirstLetter(m.ADDRESSBOOK_SOMED())}</h3>
		<form
			{...create.enhance(async ({ submit }) => {
				try {
					await submit();
					invalidate('entry:now');
				} catch (error) {
					console.log(error);
				}
			})}
		>
			<div class="grid grid-cols-1 p-4 gap-6">
				{#each create.fields.entry.issues() as issue}
							<p class="issue">{issue.message}</p>
						{/each}
					<input {...create.fields.entry.as('hidden', entry ?? '')} />
					<input
						oninput={() => {}}
						class="hidden"
						data-field="entry"
						type="text"
						placeholder=""
						bind:value={entry}
					/>
				<label class="label">
					<span>Adresse web</span>
					{#each create.fields.url.issues() as issue}
							<p class="issue">{issue.message}</p>
						{/each}
					<input {...create.fields.url.as('hidden', _url ?? '')} />
					<input
						oninput={() => {}}
						class="input"
						data-field="url"
						type="url"
						placeholder="https://"
						bind:value={_url}
					/>
				</label>
				<label class="label">
					<span>Réseau social</span>
					{#each create.fields.type.issues() as issue}
							<p class="issue">{issue.message}</p>
						{/each}
					<input {...create.fields.type.as('hidden', _type ?? '')} />
					<input
						oninput={() => {}}
						class="hidden"
						data-field="type"
						type="text"
						bind:value={_type}
					/>
					<Select items={somedTypesItems} bind:value={selectedType} />
				</label>
				<label class="label">
					<span>Accès</span>
					{#each create.fields.roles.issues() as issue}
							<p class="issue">{issue.message}</p>
						{/each}
					<input {...create.fields.roles.as('hidden', (_roles ?? []).join(','))} />
					<input
						oninput={() => {}}
						class="hidden"
						data-field="roles"
						type="text"
						placeholder=""
						bind:value={_roles}
					/>
					<Select items={accessSelectTypes} bind:value={selectedAccess} />
				</label>
			</div>
			<div class="flex gap-8">
				<div class="flex gap-2 items-center">
					{#if result?.success}
						<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
					{:else if result && !result?.success}
						<span class="badge-icon variant-filled-error"><Fa icon={faExclamationCircle} /></span
						><span class="text-base">{result?.response?.detail || result?.text}</span>
					{/if}
				</div>
				<div class="w-auto justify-center">
					<button type="submit" class="variant-filled-secondary btn w-min" {disabled}>Créer</button>
				</div>
				<div class="w-auto justify-center">
					<button
						type="button"
						class="variant-filled-error btn w-min"
						onclick={() => {
							dialog?.close();
							resetForm();
						}}
						>{#if result?.success}Fermer{:else}Annuler{/if}</button
					>
				</div>
			</div>
		</form>
	</div>
</Dialog>

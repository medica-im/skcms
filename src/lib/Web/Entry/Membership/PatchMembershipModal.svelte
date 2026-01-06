<script lang="ts">
	import { getEntryUid } from '$lib/components/Directory/context';
	import { onMount } from 'svelte';
	import { invalidate } from '$app/navigation';
	import { patchCommand } from '../../../../entry.remote';
	import { variables } from '$lib/utils/constants.ts';
	import { page } from '$app/state';
	import { SvelteSet } from 'svelte/reactivity';
	import Dialog from '$lib/Web/Dialog.svelte';
	import Fa from 'svelte-fa';
	import {
		faPlus,
		faPenToSquare,
		faCheck,
		faExclamationCircle
	} from '@fortawesome/free-solid-svg-icons';
	import Select from 'svelte-select';
	import { areArraysEqualSets } from '$lib/utils/utils.ts';
	import type { SelectType } from '$lib/interfaces/select';
	import type { Entry } from '$lib/store/directoryStoreInterface';
	import type { FormResult } from '$lib/interfaces/v2/form';

	let {
		currentMemberships
	}: {
		currentMemberships: Entry[] | null;
	} = $props();

	const uid = getEntryUid();
	let initialMemberships: SelectType[] = currentMemberships
		? currentMemberships.map((e) => {
				return {
					label: e.name,
					value: e.uid
				};
			})
		: [];
	let result: FormResult | undefined = $state();
	let selectedMemberships: SelectType[] = $state(initialMemberships);
	let disabled: boolean = $derived(
		areArraysEqualSets(
			initialMemberships.map((e) => e.value),
			selectedMemberships.map((e) => e.value)
		) || result?.success==true
	);
	let memberships = $derived({
		entry: uid,
		memberships: selectedMemberships.map((e) => e.value)
	});
	let dialog: HTMLDialogElement | undefined = $state();
	let selectedOther: SelectType[] = $state([]);
	let selectedMSP: SelectType[] = $state([]);
	let selectedCPTS: SelectType[] = $state([]);

	const entries = page.data.entries;
	let cptsItems = $derived(
		entries
			.filter((e) => e.effector_type.slug == 'cpts')
			.map((e) => {
				return { label: e.name, value: e.uid };
			})
	);
	let mspItems = $derived(
		entries
			.filter((e) => e.effector_type.name == 'maison de santé pluriprofessionnelle')
			.map((e) => {
				return { label: e.name, value: e.uid };
			})
	);
	let otherItems = $derived(
		entries.filter(
			(e) =>
				e.effector_type.name !== 'maison de santé pluriprofessionnelle' &&
				e.effector_type.slug !== 'cpts'
		).map((e) => {
				return { label: e.name, value: e.uid };
			})
	);

	function onChange(event: CustomEvent) {
		if (event.detail) {
			const e: SelectType[] = event.detail;
			for (var i = 0, len = e.length; i < len; i++) {
				const element = e[i];
				if (selectedMemberships.indexOf(element) === -1) {
					selectedMemberships.push(element);
				}
			}
		}
	}
	function onClear(event: CustomEvent) {
		if (event.detail) {
			const e: SelectType = event.detail;
			const to_delete: SelectType[] = Array.isArray(e) ? e : [e];
			const to_delete_value: string[] = to_delete.map(e=>e.value);
			selectedMemberships = selectedMemberships.filter((item) => !to_delete_value.includes(item.value));
		}
	}
	function clear() {
		selectedCPTS = [];
		selectedMSP = [];
		selectedOther = [];
	}
	async function loadMembership() {
		if (!currentMemberships) return;
		for (let m of currentMemberships) {
			const membership: SelectType = {
				label: m.name,
				value: m.uid
			};
			const cat = m.effector_type.name;
			if (cat === 'Communauté Professionnelle Territoriale de Santé') {
				selectedCPTS?.push(membership);
			} else if (cat === 'maison de santé pluriprofessionnelle') {
				selectedMSP?.push(membership);
			} else {
				selectedOther?.push(membership);
			}
		}
	}
</script>

<button
	onclick={async () => {
		result = undefined;
		loadMembership();
		dialog?.showModal();
	}}
	class="btn-icon btn-icon-sm variant-ghost-surface"
	title={memberships==null ? "Créer":"Modifier"}
	><Fa
			icon={currentMemberships && currentMemberships?.length ? faPenToSquare : faPlus}
		/></button
>
<Dialog bind:dialog>
	<div class="rounded-lg w-full p-4 variant-ghost-secondary items-center place-items-center">
		<div
			class="rounded-lg p-6 variant-ghost-secondary space-y-4 items-center place-items-center w-full"
		>
			<h3 class="h3 text-center">Affiliations</h3>
			<p>Sélectionner les organisations dont la personne est membre.</p>
			<div class="p-4 space-y-2 justify-items-stretch grid grid-cols-1 gap-2 w-full">
				<h4 class="h4">CPTS</h4>
				<Select
					multiple
					items={cptsItems}
					bind:value={selectedCPTS}
					on:change={onChange}
					on:clear={onClear}
					searchable={true}
				/>
				<!--selectedCPTS: {JSON.stringify(selectedCPTS)}<br>
				memberships: {JSON.stringify(memberships)}-->
				<h4 class="h4">MSP</h4>
				<Select
					multiple
					items={mspItems}
					bind:value={selectedMSP}
					on:change={onChange}
					on:clear={onClear}
					searchable={true}
				/>
				<h4 class="h4">Autre</h4>
				<Select
					multiple
					items={otherItems}
					bind:value={selectedOther}
					on:change={onChange}
					on:clear={onClear}
					searchable={true}
				/>

				{#if selectedMemberships?.length}
					<div class="card p-4 variant-ringed">
						<h4 class="h4">Organisations sélectionnées</h4>
						<div class="flex flex-wrap p-4 gap-4">
							{#each selectedMemberships as membership}
								<span class="badge variant-filled-primary">{membership.label}</span>
							{/each}
						</div>
					</div>
				{/if}
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
						type="submit"
						class="variant-filled-secondary btn w-min"
						onclick={async () => {
							try {
								result = await patchCommand(memberships);
								invalidate('entry:now');
							} catch (error) {
								console.error(error);
							}
						}} {disabled}>Confirmer</button
					>

					<button
						type="button"
						class="variant-filled-error btn w-min"
						onclick={() => {
							dialog?.close();
							clear();
						}}>{#if result?.success || disabled}Fermer{:else}Annuler{/if}</button
					>
				</div>
			</div>
		</div>
	</div>
</Dialog>

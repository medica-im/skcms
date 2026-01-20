<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { variables } from '$lib/utils/constants.ts';
	import { page } from '$app/state';
	import { SvelteSet } from 'svelte/reactivity';
	import Dialog from '$lib/Web/Dialog.svelte';
	import Fa from 'svelte-fa';
	import { faPlus, faCheck, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
	import Select from 'svelte-select';
	import OrganizationRadio from './../OrganizationRadio.svelte';
	import { slugify } from '$lib/helpers/stringHelpers';
	import type { Effector } from '$lib/interfaces/v2/effector.ts';
	import type { SelectType } from '$lib/interfaces/select';
	import type { EntryFull } from '$lib/store/directoryStoreInterface';

	let {
		memberships = $bindable(),
		membershipsDone = $bindable(false)
	}: {
		memberships: SelectType[];
		membershipsDone?: boolean;
	} = $props();

	let initialMemberships: SelectType[] = $state([]);
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
		entries.filter((e) => e.effector_type.name == 'maison de santé pluriprofessionnelle').map((e) => {
				return { label: e.name, value: e.uid };
			})
	);
	let otherItems = $derived(
		entries.filter(
			(e) =>
				e.effector_type.name !== 'maison de santé pluriprofessionnelle' &&
				e.effector_type.slug !== 'cpts'
		)
	);

	function onChange(event: CustomEvent) {
		console.log(`concatenate: ${JSON.stringify(event.detail)}`);
		if (event.detail) {
			const e: SelectType[] = event.detail;
			console.log(`value: ${JSON.stringify(e)}`);
			for (var i = 0, len = e.length; i < len; i++) {
				const element = e[i];
				console.log($state.snapshot(element));
				if (memberships.indexOf(element) === -1) {
					memberships.push(element);
				}
			}
			console.log(`memberships: ${JSON.stringify(memberships)}`);
		}
	}
	function onClear(event: CustomEvent) {
		console.log(`concatenate: ${JSON.stringify(event.detail)}`);
		if (event.detail) {
			const e: SelectType = event.detail;
			console.log(`value: ${JSON.stringify(e)}`);
			memberships = memberships.filter((item) => item !== e);
			console.log(`memberships: ${JSON.stringify(memberships)}`);
		}
	}
	function clear() {
		selectedCPTS = [];
		selectedMSP = [];
		selectedOther = [];
		memberships = initialMemberships;
	}
	async function loadMembership() {
		for (let m of initialMemberships) {
			const entryUid = m.value;
			let entry: EntryFull | undefined;
			const response = await fetch(`${variables.BASE_URI}/api/v2/fullentries/${entryUid}`);
			if (response.ok) {
				entry = await response.json();
			}
			if (entry) {
				const membership: SelectType = {
					label: entry.name,
					value: entry.uid
				};
				const cat = entry.effector_type.name;
				if (cat === 'communauté professionnelle territoriale de santé') {
					selectedCPTS?.push(membership);
				} else if (cat === 'maison de santé pluriprofessionnelle') {
					selectedMSP?.push(membership);
				} else {
					selectedOther?.push(membership);
				}
			}
		}
	}
</script>

<button
	onclick={async () => {
		initialMemberships = memberships;
		await loadMembership();
		dialog?.showModal();
	}}
	class="btn variant-ghost-surface"
	title="Créer"><span><Fa icon={faPlus} /></span><span>Affiliations</span></button
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

				{#if memberships.length}
					<div class="card p-4 variant-ringed">
						<h4 class="h4">Organisations sélectionnées</h4>
						<div class="flex flex-wrap p-4 gap-4">
							{#each memberships as membership}
								<span class="badge variant-filled-primary">{membership.label}</span>
							{/each}
						</div>
					</div>
				{/if}
				<div class="flex gap-8">
					<div class="w-auto justify-center">
						<button
							type="submit"
							class="variant-filled-secondary btn w-min"
							onclick={() => {
								membershipsDone = true;
								dialog?.close();
								goto("#top");
							}}>Confirmer</button
						>
					</div>
					<div class="w-auto justify-center">
						<button
							type="button"
							class="variant-filled-error btn w-min"
							onclick={() => {
								dialog?.close();
								clear();
							}}>Annuler</button
						>
					</div>
				</div>
			</div>
		</div>
	</div>
</Dialog>

<script lang="ts">
	import { faPlus } from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import { page } from '$app/state';
	import { preloadData, pushState, goto } from '$app/navigation';
	import FacilitySelect from '$lib/Web/FacilitySelect.svelte';
	import CreateFacilityModal from './CreateFacilityModal.svelte';
	import CreateFacility from '$routes/(common)/web/facility/create/+page.svelte';
	import type { SelectType } from '$lib/interfaces/select.ts';

	let {
		facility = $bindable(),
		department = $bindable(),
		selectedCommune = $bindable(),
		facilityCount = $bindable(),
	}: {
		facility: SelectType | undefined;
		department: SelectType | undefined;
		selectedCommune: SelectType | undefined;
		facilityCount: number;
	} = $props();

	let facilityCreateOpen: boolean = $state(false);

	const facilityLabel = () => {
		let label;
		if (facilityCount == 0) {
			label = "Il n'existe aucun établissement.";
		} else {
			label = `Il existe ${facilityCount} établissement${facilityCount > 1 ? 's' : ''}`;
			if (selectedCommune == undefined && department != undefined) {
				label += ' dans ce département';
			} else if (selectedCommune != undefined && department != undefined) {
				label += ' dans cette commune';
			}
			label += '.';
		}
		return label;
	};
</script>

<h3 class="h3">Sélectionner ou créer un établissement</h3>
<p>L'établissement est votre lieu de travail ou le siège social de votre organisation.</p>
<div class="w-full max-w-xl">
	<FacilitySelect
		bind:selectedFacility={facility}
		bind:department
		bind:commune={selectedCommune}
		bind:facilityCount
	/>
</div>

<div class="grid grid-cols-1 place-items-center gap-2 p-2">
	<p>Aucun établissement sélectionné</p>
	<p>{facilityLabel()}</p>
	{#if !facility && selectedCommune}
		<a
			href="/web/facility/create"
			onclick={async (e) => {
				if (e.shiftKey || e.metaKey || e.ctrlKey) return;

				e.preventDefault();
				const { href } = e.currentTarget;
				const result = await preloadData(href);

				if (result.type === 'loaded' && result.status === 200) {
					facilityCreateOpen = true;
					pushState(href, { facilityCreate: result.data });
				} else {
					goto(href);
				}
			}}
		>
			<button class="btn variant-filled-primary" title="Créer"
				><span><Fa icon={faPlus} /></span><span>Créer un établissement</span></button
			>
		</a>
	{:else}
		<button disabled class="btn variant-filled-primary" title="Créer"
			><span><Fa icon={faPlus} /></span><span>Créer un établissement</span></button
		>
		<div class="card p-2 variant-ghost-warning">
			Pour créer un nouvel établissement, vous devez sélectionner un département et une
			commune.
		</div>
	{/if}
</div>

{#if facilityCreateOpen && selectedCommune && department}
	<CreateFacilityModal onresult={() => {}} title={'Créer un établissement'} selectedFacility={facility}>
		<CreateFacility
			data={page.state.facilityCreate as any}
			commune={selectedCommune}
			bind:facilityCreateOpen
			{department}
			bind:selectedFacility={facility}
		/>
	</CreateFacilityModal>
{/if}

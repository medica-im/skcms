<script lang="ts">
	import {
		faCheck,
		faChevronRight,
		faXmark
	} from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import * as m from '$msgs';
	import FacilitySelect from '$lib/Web/FacilitySelect.svelte';
	import EffectorSelect from './Effector/EffectorSelectModal.svelte';
	import EffectorTypeSelect from '$lib/Web/EffectorTypeSelect.svelte';
	import DisplayFacility from '$lib/Web/DisplayFacility.svelte';
	import Effectors from '$lib/Web/Effectors.svelte';
	import CreateFacilityModal from '$lib/Web/Facility/CreateFacilityModal.svelte';
	import CreateEffectorModal from '$lib/Web/Effector/CreateEffectorModal.svelte';
	import DisplayEffector from './DisplayEffector.svelte';
	import { copy } from 'svelte-copy';
	import EntryCreationForm from '$lib/Web/EntryCreationForm.svelte';
	import SelectMembershipModal from './Membership/SelectMembershipModal.svelte';
	import type { Effector } from '$lib/interfaces/v2/effector.ts';
	import type { SelectType } from '$lib/interfaces/select.ts';

	const defaultDpt: SelectType = {
		label: page.data.organization.department.name,
		value: page.data.organization.department.code
	};
	let memberships: SelectType[] = $state([]);
	let membershipsDone: boolean = $state(false);
	let selectedFacility: { label: string; value: string } | undefined = $state();
	let createdEffector: Effector | undefined = $state();
	let selectedCommune: { label: string; value: string } | undefined = $state();
	let facilityCount: number = $state(0);
	let department: { label: string; value: string } | undefined = $state(defaultDpt);
	let selectedEffectorType: { label: string; value: string } | undefined = $state();
	let effectorType = $derived(selectedEffectorType?.value);
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

<!--
selectedFacility: "{JSON.stringify(selectedFacility)}"<br />
selectedEffectorType: "{JSON.stringify(selectedEffectorType)}"<br />
createdEffector: "{JSON.stringify(createdEffector)}"<br>
memberships: "{JSON.stringify(memberships)}"<br>
membershipsDone: {membershipsDone}
-->
<div id="top"></div>
{#if createdEffector && selectedFacility && selectedEffectorType && membershipsDone}
	<div class="grid grid-cols-1 w-full p-2 place-items-center">
		<EntryCreationForm
			bind:createdEffector
			bind:selectedFacility
			bind:selectedEffectorType
			{memberships}
		/>
	</div>
{:else}
	<div class="grid grid-cols-1 gap-4 w-full p-4 place-items-center">
		{#if !selectedFacility}
			<h3 class="h3">Sélectionner ou créer un établissement</h3>
			<div class="w-full max-w-xl">
				<FacilitySelect
					bind:selectedFacility
					bind:department
					bind:commune={selectedCommune}
					bind:facilityCount
				/>
			</div>

			<div class="grid grid-cols-1 place-items-center gap-2 p-2">
				<p>Aucun établissement sélectionné</p>
				<p>{facilityLabel()}</p>
				{#if !selectedFacility && selectedCommune}
					<CreateFacilityModal
						commune={selectedCommune}
						bind:selectedFacility
					/>
				{:else}
					<div class="card p-2 variant-ghost-warning">
						Pour créer un nouvel établissement, vous devez sélectionner un département et une
						commune.
					</div>
				{/if}
			</div>
		{:else}
			<div class="grid grid-cols-1 place-items-center gap-2">
				<div class="flex variant-ringed p-2 gap-4 items-center">
					<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
					<h3 class="h3">1 établissement sélectionné</h3>
					<button
						class="btn btn-icon variant-filled-error"
						title="Supprimer la sélection"
						onclick={() => {
							selectedFacility = undefined;
						}}><Fa icon={faXmark} /></button
					>
				</div>
				<DisplayFacility facilityUid={selectedFacility.value} showEffectors={true} />
			</div>
		{/if}

		{#if selectedFacility}
			<div class="grid grid-cols-1 gap-4 w-full max-w-xl p-4 place-items-center items-center">
				{#if !selectedEffectorType}
					<h3 class="h3">Sélectionner une catégorie</h3>
					<EffectorTypeSelect bind:selectedEffectorType />
				{:else}
					<div class="flex variant-ringed p-2 gap-4 items-center">
						<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
						<h3 class="h3">1 catégorie sélectionnée</h3>
						<button
							class="btn btn-icon variant-filled-error"
							title="Supprimer la sélection"
							onclick={() => {
								selectedEffectorType = undefined;
							}}><Fa icon={faXmark} /></button
						>
					</div>
					<div class="badge variant-filled"><h3 class="h3">{selectedEffectorType.label}</h3></div>
					{#if page.data.user?.role == 'superuser'}
						<p class="text-sm">
							{selectedEffectorType.value}
							<button use:copy={selectedEffectorType.value} class="btn btn-sm variant-ghost"
								>Copy!</button
							>
						</p>
					{/if}
				{/if}
			</div>
		{/if}
		{#if selectedFacility && selectedEffectorType}
			<div class="grid grid-cols-1 gap-4 w-full place-items-center p-4">
				{#if createdEffector}
					<div class="card variant-ringed p-2 items-center">
						<div class="flex p-2 gap-4 items-center">
							<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
							<h3 class="h3">1 personne sélectionnée</h3>
							<button
								class="btn btn-icon variant-filled-error"
								title="Supprimer la sélection"
								onclick={() => {
									createdEffector = undefined;
								}}><Fa icon={faXmark} /></button
							>
						</div>
					</div>
						<div class="flex p-2 gap-4 items-center">
							<DisplayEffector effectorUid={createdEffector.uid} />
						</div>
				
				{:else}
					<h3 class="h3">Sélectionner ou créer une personne physique ou morale</h3>
					{#if effectorType}
						<Effectors {effectorType} facility={selectedFacility.value} />
					{/if}
					<EffectorSelect bind:effector={createdEffector} bind:memberships />
					<CreateEffectorModal bind:memberships bind:createdEffector />
				{/if}
			</div>
		{/if}
		{#if selectedFacility && selectedEffectorType && createdEffector}
			<div class="grid grid-cols-1 gap-4 w-full place-items-center p-4">
				<h3 class="h3">Affiliations</h3>
				<p>
					Ajoutez des affiliations à des organisations (CPTS, MSP, etc.) ou passer à l'étape
					suivante.
				</p>
				<SelectMembershipModal bind:memberships bind:membershipsDone />
				<button
					onclick={async () => {
						membershipsDone = true;
						goto("#top");
					}}
					class="btn variant-ghost-surface"
					title="Passer"><span><Fa icon={faChevronRight} /></span><span>Passer</span></button
				>
			</div>
		{/if}
	</div>
{/if}

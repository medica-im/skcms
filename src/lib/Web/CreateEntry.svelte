<script lang="ts">
	import {
		faPlus,
		faCheck,
		faChevronRight,
		faExclamationCircle,
		faXmark
	} from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import { page } from '$app/state';
	import { reactiveQueryArgs } from '$lib/utils/utils.svelte';
	import { UpdateField } from '$lib/utils/requestUtils';
	import { variables } from '$lib/utils/constants';
	import { nodeBefore } from '$lib/helpers/whitespacesHelper';
	import type { User, UserResponse } from '$lib/interfaces/user.interface';
	import * as m from '$msgs';
	import OrganizationSelect from '$lib/Web/OrganizationSelect.svelte';
	import FacilitySelect from '$lib/Web/FacilitySelect.svelte';
	import EffectorSelect from './EffectorSelectModal.svelte';
	import EffectorTypeSelect from '$lib/Web/EffectorTypeSelect.svelte';
	import DisplayFacility from '$lib/Web/DisplayFacility.svelte';
	import Effectors from '$lib/Web/Effectors.svelte';
	import CreateFacilityModal from '$lib/Web/Facility/CreateFacilityModal.svelte';
	import CreateEffectorModal from '$lib/Web/Effector/CreateEffectorModal.svelte';
	import DisplayEffector from './DisplayEffector.svelte';
	import { getFacility } from '$lib/Web/data';
	import { useQueryClient, createQuery } from '@tanstack/svelte-query';
	import { copy } from 'svelte-copy';
	import type { FacilityV2, Commune } from '$lib/interfaces/v2/facility.ts';
	import type { CreateQueryResult } from '@tanstack/svelte-query';
	import EntryCreationForm from '$lib/Web/EntryCreationForm.svelte';
	import SelectMembershipModal from './Membership/SelectMembershipModal.svelte';
	import type { Effector } from '$lib/interfaces/v2/effector.ts';
	import type { SelectType } from '$lib/interfaces/select.ts';

	let top: Element | undefined = $state();

	const defaultDpt: SelectType = {
		label: page.data.organization.department.name,
		value: page.data.organization.department.code
	};
	let memberships: SelectType[] = $state([]);
	let membershipsDone: boolean = $state(false);
	let selectedFacility: { label: string; value: string } | undefined = $state();
	//let createdFacility: { label: string; value: string } | undefined = $state();
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
{#if createdEffector && selectedFacility && selectedEffectorType && membershipsDone}
	<div class="grid grid-cols-1 gap-4 w-full variant-ringed p-2 place-items-center" bind:this={top}>
		<h3 class="h3">Confirmer ou annuler la création de la nouvelle entrée</h3>
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
						org_cat={page.data.organization.category.name}
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
					{#if page.data.user?.role.name == 'superuser'}
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
												<div class="flex p-2 gap-4 items-center">
													<DisplayEffector effectorUid={createdEffector.uid} />
													</div>
					</div>
				{:else}
					<h3 class="h3">Sélectionner ou créer une personne physique ou morale</h3>
					{#if effectorType}
						<Effectors {effectorType} facility={selectedFacility.value} />
					{/if}
					<EffectorSelect bind:effector={createdEffector} bind:memberships />
					<CreateEffectorModal bind:memberships bind:createdEffector bind:top />
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
				<button onclick={async () => {membershipsDone=true}} class="btn variant-ghost-surface" title="Passer"
					><span><Fa icon={faChevronRight} /></span><span>Passer</span></button
				>
			</div>
		{/if}
	</div>
{/if}

<script lang="ts">
    import { page } from '$app/state';
	import { reactiveQueryArgs } from '$lib/utils/utils.svelte';
	import { scale } from 'svelte/transition';
	import { UpdateField } from '$lib/utils/requestUtils';
	import { variables } from '$lib/utils/constants';
	import { nodeBefore } from '$lib/helpers/whitespacesHelper';
	import type { User, UserResponse } from '$lib/interfaces/user.interface';
	import * as m from '$msgs';
	import OrganizationSelect from '$lib/Web/OrganizationSelect.svelte';
	import FacilitySelect from '$lib/Web/FacilitySelect.svelte';
	import EffectorSelect from './EffectorSelect.svelte';
	import EffectorTypeSelect from '$lib/Web/EffectorTypeSelect.svelte';
	import DisplayFacility from '$lib/Web/DisplayFacility.svelte';
	import FacilityCreationForm from '$lib/Web/FacilityCreationForm.svelte';
	import EffectorCreationForm from '$lib/Web/EffectorCreationForm.svelte';
	import Effectors from '$lib/Web/Effectors.svelte';
	import { getFacility } from '$lib/Web/data';
	import { useQueryClient, createQuery } from '@tanstack/svelte-query';
	import { copy } from 'svelte-copy';
	import type { FacilityV2, Commune } from '$lib/interfaces/v2/facility.ts';
	import type { CreateQueryResult } from '@tanstack/svelte-query';
	import type { PageProps } from './$types';
	import type { Effector } from '$lib/interfaces/v2/effector.ts';
	import EntryCreationForm from '$lib/Web/EntryCreationForm.svelte';

	let { form }: { form: PageProps } = $props();
	let memberOfOrg: boolean|undefined = $state();
	let showCreateFacilityForm: boolean = $state(false);
	let showCreateEffectorForm: boolean = $state(false);
	let showSelectEffectorForm: boolean = $state(false);
	let selectedOrganization: string | null = $state(null);
	let selectedFacility: { label: string; value: string } | undefined = $state();
	let createdFacility: { label: string; value: string } | undefined = $state();
	let createdEffector: Effector | undefined = $state();
	let selectedCommune: { label: string; value: string } | undefined = $state();

	//let facility: CreateQueryResult<FacilityV2, Error> | undefined = $state();
	let selectedFacilityUid: string | undefined = $derived(selectedFacility?.value);
	let facilityCount: number = $state(0);
	let department: {label: string, value: string}|undefined = $state();
	let selectedEffectorType: { label: string; value: string } | undefined = $state();
	let effectorType = $derived(selectedEffectorType?.value);
	let showEntryCreationForm: boolean = $derived(memberOfOrg !== undefined && selectedFacility !== undefined && selectedEffectorType !== undefined && createdEffector !== undefined);

	/*let facility = $derived.by(() => {
		if (selectedFacilityUid) {
		let facility = createQuery<FacilityV2, Error>(
			{
				queryKey: ['facilities', selectedFacilityUid],
				queryFn: () => getFacility(selectedFacilityUid)
		    }
		)
        return facility;
		}});*/
	$effect(() => {
		if (createdFacility) {
			selectedFacility = createdFacility;
		}
	});
</script>

{#if showEntryCreationForm && memberOfOrg && selectedFacility && selectedEffectorType}
			<div class="grid grid-cols-1 gap-4 w-full variant-ringed p-2">
				<h3 class="h3">Confirmer ou annuler la création de la nouvelle entrée</h3>
				<EntryCreationForm {memberOfOrg} {createdEffector} {selectedFacility} {selectedEffectorType} bind:showEntryCreationForm bind:showCreateEffectorForm {form}/>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-4 w-full p-2">
				<h3 class="h3">Sélectionner ou créer un établissement</h3>
				<!--div class="grid grid-cols-1 gap-2 w-full variant-ringed p-2">
					<OrganizationSelect bind:value={selectedOrganization} />
				</div-->
				<div class="grid grid-cols-1 gap-2 w-full variant-ringed p-2">
					<FacilitySelect
						bind:facility={selectedFacility}
						bind:department
						bind:commune={selectedCommune}
						bind:facilityCount
					/>
				</div>
				<div class="grid grid-cols-1 gap-4 variant-ghost p-4 place-items-center">
					{#if !selectedFacility}
						{#if !facilityCount}
							<p>Il n'existe aucun établissement.</p>
						{:else}
							<p>Il existe {facilityCount} établissement{facilityCount > 1 ? 's' : ''}.</p>
							<p>Aucun établisssement sélectionné</p>
						{/if}
					{:else}
						<p>Établissement sélectionné</p>
						<DisplayFacility facilityUid={selectedFacility.value} showEffectors={true}/>
					{/if}
				</div>
				<div class="grid grid-cols-1 place-items-center gap-4">
					{#if !selectedFacility && !showCreateFacilityForm}
						<button
							type="button"
							disabled={!selectedCommune}
							class="btn variant-ghost w-min"
							onclick={() => {
								showCreateFacilityForm = true;
							}}>Créer un nouvel établissement</button
						>
						{#if !selectedCommune}
							<div class="card p-2 variant-ghost-warning">
								Pour créer un nouvel établissement, vous devez sélectionner un département et une
								commune.
							</div>
						{/if}
					{/if}
				</div>
				{#if showCreateFacilityForm && selectedCommune && !selectedFacility}
					<div>
						<FacilityCreationForm
							commune={selectedCommune}
							org_cat={page.data.organization.category.name}
							bind:createdFacility
							{form}
							bind:createFacility={showCreateFacilityForm}
						/>
					</div>
				{/if}
				{#if selectedFacility}
					<h3 class="h3">Sélectionner ou créer une catégorie</h3>
					<div class="grid grid-cols-1 gap-4 w-full variant-ringed p-2">
						<EffectorTypeSelect bind:selectedEffectorType />
						{#if selectedEffectorType}
							<p>Catégorie sélectionnée: {selectedEffectorType.label}</p>
							{#if page.data.user?.role.name == 'superuser'}
								<p class="text-sm">
									{selectedEffectorType.value}
									<button use:copy={selectedEffectorType.value} class="btn btn-sm variant-ghost"
										>Copy!</button
									>
								</p>{/if}
						{:else}
							<p>Aucune catégorie sélectionnée</p>
						{/if}
					</div>
				{/if}
				{#if selectedFacility && selectedEffectorType}
					<div class="grid grid-cols-1 gap-4 w-full variant-ringed p-4">
						<h3 class="h3">Sélectionner ou créer une personne physique ou morale</h3>
						{#if effectorType}
								<Effectors {effectorType} facility={selectedFacility.value} />
						{/if}
						<button
							type="button"
							class="btn variant-ghost w-min justify-self-center"
							disabled={showSelectEffectorForm}
							onclick={() => {
								showSelectEffectorForm = true;
							}}>Sélectionner une personne existante</button
						>
						<button
							type="button"
							class="btn variant-ghost w-min justify-self-center"
							disabled={showCreateEffectorForm}
							onclick={() => {
								showCreateEffectorForm = true;
							}}>Créer une nouvelle personne</button
						>
						{#if showCreateEffectorForm}
							<EffectorCreationForm
							    bind:memberOfOrg
								bind:createdEffector
								bind:showCreateEffectorForm
								{form}
								org_cat={page.data.organization.category.name}
								{selectedEffectorType}
								{selectedFacility}
							/>
						{:else if showSelectEffectorForm}
							<EffectorSelect bind:effector={createdEffector} />
						{/if}
					</div>
				{/if}
			</div>
		{/if}
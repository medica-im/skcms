<script lang="ts">
	import {
		faCheck,
		faChevronRight,
		faXmark,
		faMagnifyingGlass
	} from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import { page } from '$app/state';
	import { preloadData, pushState, goto } from '$app/navigation';
	import { fade, slide } from 'svelte/transition';
	import SelectEffector from '$routes/(common)/web/effector/select/+page.svelte';
	import NewSelectEffectorModal from '$lib/Web/Effector/NewSelectEffectorModal.svelte';
	import * as m from '$msgs';
	import EffectorTypeSelect from '$lib/Web/EffectorTypeSelect.svelte';
	import DisplayFacility from '$lib/Web/DisplayFacility.svelte';
	import Effectors from '$lib/Web/Effectors.svelte';
	import SelectCreateFacilityAdmin from '$lib/Web/Facility/SelectCreateFacilityAdmin.svelte';
	import CreateEffectorModal from '$lib/Web/Effector/CreateEffectorModal.svelte';
	import DisplayEffector from './DisplayEffector.svelte';
	import { copy } from 'svelte-copy';
	import EntryCreationForm from '$lib/Web/EntryCreationForm.svelte';
	import SelectMembershipModal from './Membership/SelectMembershipModal.svelte';
	import StepProgress from '$lib/Web/StepProgress.svelte';
	import type { Effector } from '$lib/interfaces/v2/effector.ts';
	import type { SelectType } from '$lib/interfaces/select.ts';
	import type { User } from '$lib/interfaces/user.interface.ts';

	let {
		user,
		effectors
	}: {
		user: User;
		effectors: Effector[];
	} = $props();

	const defaultDpt: SelectType | undefined = page.data.directory.department_default
		? {
				label: page.data.organization.department.name,
				value: page.data.organization.department.code
			}
		: undefined;
	/*TODO:
	const communeDefault: SelectType|undefined = page.data.directory.commune_default ? {
		label: page.data.organization.commune.name,
		value: page.data.organization.commune.uid
	} : undefined;*/
	let selectEffectorModal: NewSelectEffectorModal | undefined = $state();
	let memberships: SelectType[] = $state([]);
	let membershipsDone: boolean = $state(false);
	let displayMembershipStep: boolean = $derived(["superuser", "administrator"].includes(page.data.user.role));
	let facility: { label: string; value: string } | undefined = $state();
	let effector: Effector | undefined = $state();
	let selectedCommune: { label: string; value: string } | undefined = $state();
	let facilityCount: number = $state(0);
	let department: { label: string; value: string } | undefined = $state(defaultDpt);
	let effectorType: { label: string; value: string } | undefined = $state();
	let effectorTypeValue = $derived(effectorType?.value);
	let submitted: boolean = $state(false);
	let steps = $derived([
		{ label: 'Établissement', completed: !!facility },
		{ label: 'Catégorie', completed: !!effectorType },
		{ label: 'Personne', completed: !!effector },
		{ label: 'Valider', completed: submitted }
	]);
	const scrollIntoView: import('svelte/action').Action = (node) => {
		node.scrollIntoView({ behavior: 'smooth', block: 'start' });
	};
</script>

<!--
facility: "{JSON.stringify(facility)}"<br />
effectorType: "{JSON.stringify(effectorType)}"<br />
createdEffector: "{JSON.stringify(createdEffector)}"<br>
memberships: "{JSON.stringify(memberships)}"<br>
membershipsDone: {membershipsDone}
-->
<div id="top"></div>
<StepProgress {steps} />
{#if effector && facility && effectorType && (membershipsDone||!displayMembershipStep)}
	<div
		class="grid grid-cols-1 w-full p-2 place-items-center"
		in:slide={{ duration: 400, delay: 300 }}
		out:fade={{ duration: 200 }}
		use:scrollIntoView
	>
		<EntryCreationForm
			bind:effector
			bind:facility
			bind:effectorType
			bind:submitted
			{memberships}
		/>
	</div>
{:else}
	<div class="grid grid-cols-1 gap-4 w-full p-4 place-items-center" out:fade={{ duration: 200 }}>
		{#if !facility}
			<SelectCreateFacilityAdmin
				bind:facility
				bind:department
				bind:selectedCommune
				bind:facilityCount
			/>
		{:else}
			<div class="grid grid-cols-1 place-items-center gap-2">
				<div class="flex variant-ringed p-2 gap-4 items-center">
					<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
					<h3 class="h3">1 établissement sélectionné</h3>
					<button
						class="btn btn-icon variant-filled-error"
						title="Supprimer la sélection"
						onclick={() => {
							facility = undefined;
						}}><Fa icon={faXmark} /></button
					>
				</div>
				<DisplayFacility facilityUid={facility.value} showEffectors={true} />
			</div>
		{/if}

		{#if facility}
			<div
				class="grid grid-cols-1 gap-4 w-full max-w-xl p-4 place-items-center items-center"
				use:scrollIntoView
			>
				{#if !effectorType}
					<h3 class="h3">Sélectionner une catégorie</h3>
					<EffectorTypeSelect bind:selectedEffectorType={effectorType} />
				{:else}
					<div class="flex variant-ringed p-2 gap-4 items-center">
						<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
						<h3 class="h3">1 catégorie sélectionnée</h3>
						<button
							class="btn btn-icon variant-filled-error"
							title="Supprimer la sélection"
							onclick={() => {
								effectorType = undefined;
							}}><Fa icon={faXmark} /></button
						>
					</div>
					<div class="card variant-soft p-2"><h3 class="h3">{effectorType.label}</h3></div>
					{#if page.data.user?.role == 'superuser'}
						<p class="text-sm">
							{effectorType.value}
							<button use:copy={effectorType.value} class="btn btn-sm variant-ghost"
								>Copy!</button
							>
						</p>
					{/if}
				{/if}
			</div>
		{/if}
		{#if facility && effectorType}
			<div class="grid grid-cols-1 gap-4 w-full place-items-center p-4" use:scrollIntoView>
				{#if effector}
					<div class="card variant-ringed p-2 items-center">
						<div class="flex p-2 gap-4 items-center">
							<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
							<h3 class="h3">1 personne sélectionnée</h3>
							<button
								class="btn btn-icon variant-filled-error"
								title="Supprimer la sélection"
								onclick={() => {
									effector = undefined;
								}}><Fa icon={faXmark} /></button
							>
						</div>
					</div>
					<div class="flex p-2 gap-4 items-center">
						<DisplayEffector effectorUid={effector.uid} />
					</div>
				{:else}
					<h3 class="h3">Sélectionner ou créer une personne physique ou morale</h3>
					{#if effectorTypeValue}
						<Effectors effectorType={effectorTypeValue} facility={facility.value} />
					{/if}
					{#if effectors?.length}
					<a
						href="/web/effector/select"
						onclick={async (e) => {
							if (
								e.shiftKey || // or the link is opened in a new window
								e.metaKey ||
								e.ctrlKey // or a new tab (mac: metaKey, win/linux: ctrlKey)
								// should also consider clicking with a mouse scroll wheel
							)
								return;

							// prevent navigation
							e.preventDefault();

							const { href } = e.currentTarget;

							// run `load` functions (or rather, get the result of the `load` functions
							// that are already running because of `data-sveltekit-preload-data`)
							const result = await preloadData(href);

							if (result.type === 'loaded' && result.status === 200) {
								pushState(href, { selected: result.data });
							} else {
								// something bad happened! try navigating
								goto(href);
							}
						}}
					>
						<button class="btn variant-filled-primary subtle-glow" title="Sélectionner une personne"
							><span><Fa icon={faMagnifyingGlass} /></span><span
								>Sélectionner une personne existante</span
							></button
						>
					</a>
					{/if}
					<CreateEffectorModal bind:memberships bind:effector />
				{/if}
			</div>
		{/if}
		{#if facility && effectorType && effector && displayMembershipStep}
			<div class="grid grid-cols-1 gap-4 w-full place-items-center p-4" use:scrollIntoView>
				<h3 class="h3">Affiliations</h3>
				<p>
					Ajoutez des affiliations à des organisations (CPTS, MSP, etc.) ou passer à l'étape
					suivante.
				</p>
				<SelectMembershipModal bind:memberships bind:membershipsDone />
				<button
					onclick={async () => {
						membershipsDone = true;
						goto('#top');
					}}
					class="btn variant-filled-primary"
					title="Passer"><span><Fa icon={faChevronRight} /></span><span>Passer</span></button
				>
			</div>
		{/if}
	</div>
{/if}
{#if page.state.selected}
	<NewSelectEffectorModal
		bind:this={selectEffectorModal}
		{effector}
		onresult={(result) => {
			console.log('result', result);
			history.back();
		}}
		title={'Sélectionner une personne'}
	>
		<SelectEffector bind:effector bind:memberships data={page.state.selected} />
	</NewSelectEffectorModal>
{/if}

<style>
	.subtle-glow {
		animation: subtle-glow 2s ease-in-out 3;
	}
	@keyframes subtle-glow {
		0%,
		100% {
			box-shadow: 0 0 0 0 transparent;
		}
		50% {
			box-shadow: 0 0 0 3px rgba(var(--color-primary-500) / 0.25);
		}
	}
</style>

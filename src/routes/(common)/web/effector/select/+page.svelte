<script lang="ts">
	import { page } from '$app/state';
	import * as m from '$msgs';
	import Select from 'svelte-select';
	import EffectorTypeSelect from '$lib/Web/EffectorTypeSelect.svelte';
	import FacilitySelect from '$lib/Web/FacilitySelect.svelte';
	import OrganizationRadio from '$lib/Web/OrganizationRadio.svelte';
	import type { Commune, DepartmentOfFrance, FacilityV2 } from '$lib/interfaces/v2/facility.ts';
	import type { Effector } from '$lib/interfaces/v2/effector.ts';
	import type { SelectType } from '$lib/interfaces/select.ts';
	import type { Entry } from '$lib/store/directoryStoreInterface.ts';
	import type { User } from '$lib/interfaces/user.interface.ts';

	interface Props {
	effector: Effector | undefined;
	memberships: SelectType[];
	data: {
		effectors: Effector[];
		user: User;
	};
	}

	let { effector=$bindable(), data, memberships=$bindable() } : Props = $props();
	let userIsAdmin: boolean = $derived(['superuser', 'administrator'].includes(data.user.role)); 
	let isMember: boolean | undefined = $state();
	const defaultDpt: SelectType = {
		label: page.data.organization.department.name,
		value: page.data.organization.department.code
	};
	let selectedEffector: SelectType | undefined = $state();
	let selectedEffectorType: SelectType | undefined = $state();
	let facility: SelectType | undefined = $state();
	let department: SelectType | undefined = $state();
	let departmentCode: string | undefined = $derived(department?.value);
	let commune: SelectType | undefined = $state();
	let communeUid: string | undefined = $derived(commune?.value);
	let facilityCount: number = $state(0);
	const entries: Entry[] = $derived(page.data.entries);
	let filteredEffectors: Effector[]|undefined = $derived.by(()=> 	{
		if (data?.effectors) {
			return getFilteredEffectors(data.effectors)
		}
	}
	);

	function getFilteredEffectors(effectors: Effector[]) {
		if (effectors) {
			return effectors.filter((e) => {
				if (!selectedEffectorType) {
					return true;
				} else {
					const _type = selectedEffectorType.value;
					const effectorUids = entries
						.filter((e) => e.effector_type.uid == _type)
						.map((e) => e.effector_uid);
					return effectorUids.includes(e.uid);
				}
			}).filter((e) => {
				if (!departmentCode) {
					return true;
				} else {
					const effectorUids = entries
						.filter((e) => e.department.code == departmentCode)
						.map((e) => e.effector_uid);
					return effectorUids.includes(e.uid);
				}
			}).filter((e) => {
				if (!communeUid) {
					return true;
				} else {
					const effectorUids = entries
						.filter((e) => e.commune.uid == communeUid)
						.map((e) => e.effector_uid);
					return effectorUids.includes(e.uid);
				}
			}).filter((e) => {
				if (facility==undefined) {
					return true;
				} else {
					const effectorUids = entries
						.filter((e) => e.facility.uid == facility?.value)
						.map((e) => e.effector_uid);
					return effectorUids.includes(e.uid);
				}
			});
		} else {
			return [];
		}
	};
	let disabled: boolean = $derived(!selectedEffector);
	
	const getLabel = (effector: Effector) => {
		return `${effector.name_fr}`;
	};

	function compareFn(a: Effector, b: Effector) {
		return a.name_fr.localeCompare(b.name_fr);
	}

	function getEffectorItems(effectors: Effector[]) {
		effectors.sort(compareFn);
		return effectors.map((e) => {
			return { value: e.uid, label: getLabel(e) };
		});
	};

	const effectorLabel = (effectors: Effector[]) => {
		return `Personne${effectors?.length > 1 ? 's' : ''}: ${effectors?.length||0}`;
	};
	function confirm() {
		if (selectedEffector !== undefined && data?.effectors) {
			const uid = selectedEffector.value;
			effector = data.effectors.find((e) => e.uid == uid);
			disabled = true;
		}
		if ( isMember ) {
			const orgItem = {
				label: page.data.organization.formatted_name,
				value: page.data.organization.uid
			};
			if (memberships.indexOf(orgItem) === -1) {
				memberships.push(orgItem);
			}
		}
		history.back();
	};
</script>

<div class="grid grid-cols-1 rounded-lg h-full w-full p-4 items-center gap-4">
		<div class="place-items-center">
			<h3 class="h3">Sélectionner une personne</h3>
			{#if userIsAdmin}
			<p>Si la personne recherchée a déjà une entrée dans l'annuaire, vous pouvez affiner la recherche en sélectionnant sa catégorie, sa localisation ou son établissement.</p>
			{:else}
			<p>Si vous avez créé une personne physique ou morale précédemment, elle apparaîtra dans la liste. Si la liste est vide ou si vous souhaitez créer une nouvelle personne, cliquer sur "Annuler" puis sur "Créer une personne".</p>
			{/if}
		</div>
		{#if userIsAdmin}
		<EffectorTypeSelect bind:selectedEffectorType />
		<FacilitySelect
			bind:selectedFacility={facility}
			bind:department
			bind:commune
			bind:facilityCount
		/>
		{/if}
		{#if filteredEffectors}
		<div class="grid grid-cols-1 gap-4 variant-ghost p-4">
			<p>{effectorLabel(filteredEffectors)}</p>
			<div class="effector-select">
				<Select items={getEffectorItems(filteredEffectors)} hasError={selectedEffector ? false : true} bind:value={selectedEffector} placeholder="Sélectionner une personne" />
			</div>
		</div>
		{/if}
		<div class="card variant-ghost p-4">
			<p>
				La personne est-elle affiliée à {page.data.organization.formatted_name}?
			</p>
			<OrganizationRadio bind:isMember />
		</div>
		<div class="flex gap-8 justify-center">
			<div class="w-auto justify-center">
				<button
					type="button"
					class="variant-filled-secondary btn w-min"
					{disabled}
					onclick={()=>confirm()}>Confirmer</button
				>
			</div>
			<div class="w-auto justify-center">
				<button
					type="button"
					class="variant-filled-error btn w-min"
					onclick={() => history.back()}>Annuler</button
				>
			</div>
		</div>
	</div>

<style>
	.effector-select {
		--border-color: rgb(var(--color-primary-500));
		--border: 2px solid rgb(var(--color-primary-500));
		--border-focused: 2px solid rgb(var(--color-primary-700));
		--border-hover: 2px solid rgb(var(--color-primary-600));
		--placeholder-color: rgb(var(--color-primary-700));
		--border-radius: var(--theme-rounded-container);
		--height: 3rem;
		--background: rgb(var(--color-surface-200));
		--list-background: rgb(var(--color-surface-200));
		--item-color: rgb(var(--color-surface-900));
		--item-hover-bg: rgb(var(--color-primary-500) / 0.15);
		--item-is-active-bg: rgb(var(--color-primary-500) / 0.25);
		--input-color: rgb(var(--color-surface-900));
		animation: subtle-glow 2s ease-in-out 3;
	}
	:global(.dark) .effector-select {
		--background: rgb(var(--color-surface-700));
		--list-background: rgb(var(--color-surface-700));
		--item-color: rgb(var(--color-surface-100));
		--input-color: rgb(var(--color-surface-100));
		--placeholder-color: rgb(var(--color-primary-300));
		--error-background: rgb(var(--color-surface-700));
		--error-border: 1px solid rgb(var(--color-error-500));
	}
	@keyframes subtle-glow {
		0%, 100% { box-shadow: 0 0 0 0 transparent; }
		50% { box-shadow: 0 0 0 3px rgba(var(--color-primary-500) / 0.25); border-radius: var(--theme-rounded-container); }
	}
</style>

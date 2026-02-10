<script lang="ts">
	import * as m from '$msgs';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import Select from 'svelte-select';
	import type { SelectType } from '$lib/interfaces/select.ts';
	import type { Commune, DepartmentOfFrance, FacilityV2 } from '$lib/interfaces/v2/facility.ts';
	import { getCommunesByDpt, getDepartments, getFacilities } from './data';

	let {
		selectedFacility = $bindable(),
		department = $bindable(),
		commune = $bindable(),
		facilityCount = $bindable()
	}: {
		selectedFacility: SelectType | undefined;
		department: SelectType | undefined;
		commune: SelectType | undefined;
		facilityCount: number;
	} = $props();
	let allFacilities: FacilityV2[] | undefined = $state();
	let departmentCode: string | undefined = $derived(department?.value);

	let communes: Commune[]|undefined = $state();
	let departments: DepartmentOfFrance[]|undefined = $state();
	const communeItems = $derived.by(() => {
		if ( !communes ) {
			return;
		}
		const sortedCommunes = communes.toSorted(compareFnCommune);
		return sortedCommunes.map((e) => {
			return { value: e.uid, label: e.name_fr };
		});
	});

	const onDepartmentChange = async () => {
		commune = undefined;
		if ( department ) {
			communes = await getCommunesByDpt(department.value);
		} else {
			communes = undefined;
		}
		updateFacilityCount();
	};

	const onDepartmentClear = () => {
		department = undefined;
		updateFacilityCount();
	};

	const onCommuneChange = () => {
		updateFacilityCount();
	};

	const onCommuneClear = () => {
		commune = undefined;
		updateFacilityCount();
	};

	const updateFacilityCount = () => {
		console.log('updateFacilityCount');
		if (allFacilities) {
			facilityCount = allFacilities
				.filter((e) => (department ? e.commune.department.code == department.value : true))
				.filter((e) => (commune ? e.commune.uid == commune.value : true)).length;
			return facilityCount;
		}
		return 0;
	};

	onMount(async () => {
		departments = await getDepartments();
		allFacilities = await getFacilities();
		if ( department ) {
			communes = await getCommunesByDpt(department.value);
		} else {
			communes = undefined;
		}
		updateFacilityCount();
	});

	const getName = (facility: FacilityV2) => {
		if (facility.name) {
			return facility.name;
		} else if (facility.effectors) {
			const count = facility.effectors.length;
			const effectors = `${facility.effectors.join(', ')}`;
			return `${count} effecteur${count > 1 ? 's' : ''}: ${effectors}`;
		} else {
			return facility.uid;
		}
	};
	const getLabel = (facility: FacilityV2) => {
		return `[${facility.commune.department.name}] - [${facility.commune.name_fr}] - ${getName(facility)}`;
	};

	function compareFnFacility(a: FacilityV2, b: FacilityV2) {
		const dpt = a.commune.department.name.localeCompare(b.commune.department.name);
		if (dpt == 0) {
			return a.commune.name_fr.localeCompare(b.commune.name_fr);
		} else {
			return dpt;
		}
	}

	function compareFnCommune(a: Commune, b: Commune) {
		return a.name_fr.localeCompare(b.name_fr);
	}

	const getDepartmentItems = (departments: DepartmentOfFrance[]|undefined) => {
		if (!departments) return null
		const sortedDepartments = departments.toSorted((a: DepartmentOfFrance, b: DepartmentOfFrance) =>
			a.code.localeCompare(b.code)
		);
		return sortedDepartments.map((e) => {
			return { value: e.code, label: `${e.code} - ${e.name}` };
		});
	};

	const getFacilityItems = (facilities: FacilityV2[]) => {
		const sortedFacilities = facilities.toSorted(compareFnFacility);
		return sortedFacilities
			.filter((e) => (department ? e.commune.department.code == department.value : true))
			.filter((e) => (commune ? e.commune.uid == commune.value : true))
			.map((e) => {
				return { value: e.uid, label: getLabel(e) };
			});
	};

	const getFacilityCount = (facilities: FacilityV2[]) => {
		return facilities ? getFacilityItems(facilities).length : 0;
	};

	const facilityLabel = (facilities: FacilityV2[]) => {
		return `Établissement${getFacilityCount(facilities) > 1 ? 's' : ''}: ${getFacilityCount(facilities)}`;
	};
</script>

<div class="p-4 theme">
	<div class="grid grid-cols-1 gap-4 variant-ghost p-4">
		<p>Département</p>
			<Select
				items={getDepartmentItems(departments)}
				bind:value={department}
				on:clear={onDepartmentClear}
				on:change={onDepartmentChange}
				placeholder="Sélectionner un département"
			/>
	</div>
	<div class="grid grid-cols-1 gap-4 variant-ghost p-4">
		<p>Commune</p>
		{#if !departmentCode}
		<Select
			disabled={true}
				items={null}
				placeholder="Sélectionner d'abord un département"
			/>
		{:else}
			<Select
				items={communeItems}
				bind:value={commune}
				on:clear={onCommuneClear}
				on:change={onCommuneChange}
				placeholder="Sélectionner une commune"
			/>
		{/if}
	</div>
	<div class="grid grid-cols-1 gap-4 variant-ghost p-4">
		{#if allFacilities}
			<p>{facilityLabel(allFacilities)}</p>
			<div class="facility-glow">
				<Select
					items={getFacilityItems(allFacilities)}
					bind:value={selectedFacility}
					placeholder="Sélectionner un établissement"
				/>
			</div>
		{:else}
		<p>{m.LOADING()}</p>
		<Select
			loading={true}
				items={null}
				placeholder={m.LOADING()}
			/>
		{/if}
	</div>
</div>

<style>
	/*
			CSS variables can be used to control theming.
			https://github.com/rob-balfre/svelte-select/blob/master/docs/theming_variables.md
	*/
	.theme {
		--border-radius: var(--theme-rounded-container);
		--border-color: rgb(var(--color-secondary-500));
		--border-focused: 1px solid rgb(var(--color-secondary-500));
		--border-hover: 1px solid rgb(var(--color-secondary-500));
		--item-active-outline: 1px solid rgb(var(--color-secondary-500));
		--item-outline: 1px solid rgb(var(--color-secondary-500));
		--clear-select-focus-outline: 1px solid rgb(var(--color-secondary-500));
		--height: 3rem;
	}
	.facility-glow {
		--border-color: rgb(var(--color-primary-500));
		--border: 2px solid rgb(var(--color-primary-500));
		--border-focused: 2px solid rgb(var(--color-primary-700));
		--border-hover: 2px solid rgb(var(--color-primary-600));
		--placeholder-color: rgb(var(--color-primary-700));
		animation: subtle-glow 2s ease-in-out 3;
	}
	@keyframes subtle-glow {
		0%, 100% { box-shadow: 0 0 0 0 transparent; }
		50% { box-shadow: 0 0 0 3px rgba(var(--color-primary-500) / 0.25); border-radius: var(--theme-rounded-container); }
	}
</style>

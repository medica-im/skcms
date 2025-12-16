<script lang="ts">
	import * as m from '$msgs';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { reactiveQueryArgs } from '$lib/utils/utils.svelte';
	import Select from 'svelte-select';
	import type { SelectType } from '$lib/interfaces/select.ts';
	import { createQuery } from '@tanstack/svelte-query';
	import type { CreateQueryResult } from '@tanstack/svelte-query';
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
	let communes: CreateQueryResult<Commune[], Error> | undefined = $state();
	//let commune: any = $state();

	const facilities = createQuery<FacilityV2[], Error>({
		queryKey: ['facilities'],
		queryFn: () => getFacilities()
	});

	const facilityStore = createQuery(
		reactiveQueryArgs(() => ({
			queryKey: ['facilityStore'],
			queryFn: () => getFacilities()
		}))
	);

	let { error, isLoading, isRefetching, data } = $derived($facilityStore);

	const onDepartmentChange = () => {
		updateFacilityCount();
		commune = undefined;
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
		allFacilities = await getFacilities();
		updateFacilityCount();
	});

	$effect(() => {
		if (departmentCode) {
			communes = createQuery<Commune[]>({
				queryKey: ['post', departmentCode],
				queryFn: () => getCommunesByDpt(departmentCode)
			});
		}
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

	const getDepartmentItems = (departments: DepartmentOfFrance[]) => {
		departments.sort((a: DepartmentOfFrance, b: DepartmentOfFrance) =>
			a.name.localeCompare(b.name)
		);
		return departments.map((e) => {
			return { value: e.code, label: e.name };
		});
	};

	const getFacilityItems = (facilities: FacilityV2[], department: any, commune: any) => {
		facilities.sort(compareFnFacility);
		return facilities
			.filter((e) => (department ? e.commune.department.code == department.value : true))
			.filter((e) => (commune ? e.commune.uid == commune.value : true))
			.map((e) => {
				return { value: e.uid, label: getLabel(e) };
			});
	};

	const getFacilityCount = (facilities: FacilityV2[]) => {
		return facilities ? getFacilityItems(facilities, department, commune).length : 0;
	};

	const facilityLabel = (facilities: FacilityV2[]) => {
		return `Établissement${getFacilityCount(facilities) > 1 ? 's' : ''}: ${getFacilityCount(facilities)}`;
	};

	const getCommuneItems = (communes: Commune[] | undefined) => {
		if (!communes) {
			return;
		}
		communes.sort(compareFnCommune);
		return communes.map((e) => {
			return { value: e.uid, label: e.name_fr };
		});
	};
	const facilitySummary = () => {
		let label;
		if (facilityCount == 0) {
			label = "Il n'existe aucun établissement.";
		} else {
			label = `Il existe ${facilityCount} établissement${facilityCount > 1 ? 's' : ''}`;
			if (commune == undefined && department != undefined) {
				label += ' dans ce département';
			} else if (commune != undefined && department != undefined) {
				label += ' dans cette commune';
			}
			label += '.';
		}
		return label;
	};
</script>

<div class="p-4">
	<div class="grid grid-cols-1 gap-4 variant-ghost p-4">
		<p>Département</p>
		<svelte:boundary>
			{#snippet pending()}
				<span>{m.LOADING()}</span>
			{/snippet}
			{#snippet failed(error: any, reset)}
				<span>{m.ERROR()}: {error.message}</span>
			{/snippet}
			<Select
				items={getDepartmentItems(await getDepartments())}
				bind:value={department}
				on:clear={onDepartmentClear}
				on:change={onDepartmentChange}
				placeholder="Sélectionner un département"
			/>
		</svelte:boundary>
	</div>
	<div class="grid grid-cols-1 gap-4 variant-ghost p-4">
		<p>Commune</p>
		{#if !departmentCode}
		<Select
			disabled={true}
				items={null}
				placeholder="Sélectionner d'abord un département"
			/>
		{:else if $communes?.status === 'pending'}
			<Select
			loading={true}
				items={null}
				placeholder="Sélectionner d'abord un département"
			/>
		{:else if $communes?.status === 'error'}
			<span>Error: {$communes?.error.message}</span>
		{:else}
			<Select
				items={getCommuneItems($communes?.data)}
				bind:value={commune}
				on:clear={onCommuneClear}
				on:change={onCommuneChange}
				placeholder="Sélectionner une commune"
			/>
		{/if}
	</div>
	<div class="grid grid-cols-1 gap-4 variant-ghost p-4">
		{#if $facilities.status === 'pending'}
			<span>Loading...</span>
		{:else if $facilities.status === 'error'}
			<span>Error: {$facilities.error.message}</span>
		{:else}
			<p>{facilityLabel($facilities.data)}</p>
			<Select
				items={getFacilityItems($facilities.data, department, commune)}
				bind:value={selectedFacility}
				placeholder="Sélectionner un établissement"
			/>
		{/if}
	</div>
</div>

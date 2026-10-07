<script lang="ts">
	import * as m from '$msgs';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import Select from '$lib/Web/Select.svelte';
	import NoOptions from '$lib/Web/NoOptions.svelte';
	import type { SelectType } from '$lib/interfaces/select.ts';
	import type { Commune, DepartmentOfFrance, FacilityV2 } from '$lib/interfaces/v2/facility.ts';
	import { getCommunesByDpt, getDepartments, getFacilities } from './data';
	import { normalize } from '$lib/helpers/stringHelpers.ts';
	import { userRoles } from '$lib/auth/roles';
	import { facilityMatches, facilityOptionLabel, facilitySearchText } from './facilityOption';

	const communeFilter = (label: any, filterText: any) => {
		return normalize(label).includes(normalize(filterText));
	};
	const departmentFilter = (label: any, filterText: any) => {
		return normalize(label).includes(normalize(filterText));
	};
	// Per word, and the facility's label too: see facilityOption.test.ts.
	const facilityFilter = (label: any, filterText: any, option: any) => {
		return facilityMatches(option?.search ?? label, filterText);
	};

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

	const r = $derived(userRoles(page.data?.user?.role));
	// Superusers only: every site's facilities, e.g. for a new project's
	// organization entry. Off by default so the site's own list stays short.
	let allSites: boolean = $state(false);

	const loadFacilities = async () => {
		allFacilities = undefined;
		allFacilities = await getFacilities(allSites ? 'all' : 'site');
		updateFacilityCount();
	};

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
		commune = undefined;
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
		await loadFacilities();
		if ( department ) {
			communes = await getCommunesByDpt(department.value);
		} else {
			communes = undefined;
		}
		updateFacilityCount();
	});

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
		const selected = { department: !!department, commune: !!commune };
		return facilities
			.filter((e) => (department ? e.commune.department.code == department.value : true))
			.filter((e) => (commune ? e.commune.uid == commune.value : true))
			.map((e) => {
				const label = facilityOptionLabel(e, selected);
				return { value: e.uid, label, search: facilitySearchText(e, label) };
			})
			// Sorted as read: the name comes first now.
			.toSorted((a, b) => a.label.localeCompare(b.label, 'fr'));
	};

	const getFacilityCount = (facilities: FacilityV2[]) => {
		return facilities ? getFacilityItems(facilities).length : 0;
	};

	const facilityLabel = (facilities: FacilityV2[]) => {
		return `Établissement${getFacilityCount(facilities) > 1 ? 's' : ''}: ${getFacilityCount(facilities)}`;
	};
</script>

<!--
	Full width on a phone, where nested paddings had left a 375px screen a
	247px field; on a large screen, 96ch: room for 90% of production's lines
	(86 characters). Longer ones are cut and show whole on hover.
-->
<div class="facility-select svelte-select w-full lg:max-w-[96ch] py-4 sm:p-4">
	<div class="grid grid-cols-1 gap-4 variant-ghost p-2 sm:p-4">
		<p>Département</p>
			<Select
				items={getDepartmentItems(departments)}
				itemFilter={departmentFilter}
				bind:value={department}
				on:clear={onDepartmentClear}
				on:change={onDepartmentChange}
				placeholder="Sélectionner un département"
			><NoOptions slot="empty" /></Select>
	</div>
	<div class="grid grid-cols-1 gap-4 variant-ghost p-2 sm:p-4">
		<p>Commune</p>
		{#if !departmentCode}
		<Select
			disabled={true}
				items={null}
				placeholder="Sélectionner d'abord un département"
			><NoOptions slot="empty" /></Select>
		{:else}
			<Select
				items={communeItems}
				itemFilter={communeFilter}
				bind:value={commune}
				on:clear={onCommuneClear}
				on:change={onCommuneChange}
				placeholder="Sélectionner une commune"
			><NoOptions slot="empty" /></Select>
		{/if}
	</div>
	<div class="grid grid-cols-1 gap-4 variant-ghost p-2 sm:p-4">
		{#if r.SuperUser}
			<label class="flex items-center gap-2 min-h-11">
				<input type="checkbox" bind:checked={allSites} onchange={loadFacilities} />
				{m.FACILITIES_ALL_SITES()}
			</label>
		{/if}
		{#if allFacilities}
			<p>{facilityLabel(allFacilities)}</p>
			<div class="svelte-select-glow">
				<Select
					items={getFacilityItems(allFacilities)}
					itemFilter={facilityFilter}
					bind:value={selectedFacility}
					placeholder="Sélectionner un établissement"
				><NoOptions slot="empty" /></Select>
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
	/* On a phone, svelte-select's own insets (16px before the text, 20px on
	   each side of an option) are width the lines need more. */
	@media (max-width: 639px) {
		.facility-select {
			--padding: 0 0 0 8px;
			--item-padding: 0 8px;
		}
	}
</style>

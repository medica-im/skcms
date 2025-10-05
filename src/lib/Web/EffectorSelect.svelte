<script lang="ts">
	import { page } from '$app/state';
	import * as m from '$msgs';
	import { reactiveQueryArgs } from '$lib/utils/utils.svelte';
	import Select from 'svelte-select';
	import { useQueryClient, createQuery } from '@tanstack/svelte-query';
	import EffectorTypeSelect from './EffectorTypeSelect.svelte';
	import FacilitySelect from './FacilitySelect.svelte';
	import OrganizationRadio from './OrganizationRadio.svelte';
	import type { CreateQueryResult } from '@tanstack/svelte-query';
	import type { Commune, DepartmentOfFrance, FacilityV2 } from '$lib/interfaces/v2/facility.ts';
	import type { Effector } from '$lib/interfaces/v2/effector.ts';
	import type { SelectType } from '$lib/interfaces/select.ts';
	import { getEffectors } from './data';

	let {
		effector = $bindable(),
		memberOfOrg = $bindable(),
		showSelectEffectorForm = $bindable(),
	}: {
		effector: Effector | undefined;
		memberOfOrg: boolean|undefined;
		showSelectEffectorForm: boolean;
	} = $props();

    const defaultDpt: SelectType = {label: page.data.organization.department.name, value: page.data.organization.department.code};
	let isConfirmed: boolean = $state(false);
	let selectedEffector: SelectType | undefined = $state();
	let selectedEffectorType: SelectType | undefined = $state();
	let facility: SelectType | undefined = $state();
	let department: SelectType | undefined = $state(defaultDpt);
	let departmentCode: string | undefined = $derived(department?.value);
	let communes: CreateQueryResult<Commune[], Error> | undefined = $state();
	let commune: any = $state();
	let facilityCount: number = $state(0);

	interface InputClass {
		effector: string;
		memberOfOrg: string;
	}
	interface ValidateForm {
		effector: boolean;
		memberOfOrg: boolean;
	}
	const inputError = 'input-error';
    
	const validateForm: ValidateForm = $state({
		effector: false,
		memberOfOrg: false
	});
	const inputClass: InputClass = $state({
		effector: '',
		memberOfOrg: ''
	});

	let disabled: boolean = $derived(!Object.values(validateForm).every((v) => v === true));

	/**
	 * Validate radio memberOfOrg input.
	 */
	$effect(() => {
		if (memberOfOrg) {
			validateForm.memberOfOrg = true;
			inputClass.memberOfOrg = '';
		} else {
			inputClass.memberOfOrg = inputError;
			validateForm.memberOfOrg = false;
		}
	});

	/**
	 * Validate effector select input.
	 */
	$effect(() => {
		if (selectedEffector) {
			validateForm.effector = true;
			inputClass.effector = '';
		} else {
			inputClass.effector = inputError;
			validateForm.effector = false;
		}
	});

	const effectors = createQuery<Effector[], Error>({
		queryKey: ['effectorSelect'],
		queryFn: () => getEffectors({ effector_type: selectedEffectorType?.value })
	});

	const effectorSelectStore = createQuery(
		reactiveQueryArgs(() => ({
			queryKey: ['effectorSelectStore', selectedEffectorType, department],
			queryFn: () => getEffectors({ effector_type: selectedEffectorType?.value, department_of_france: department?.value })
		}))
	);

	let { error, isLoading, isRefetching, data } = $derived($effectorSelectStore);
	let effectorItems = $state();
	$effect(() => {
		if (data) {
			effectorItems = data.map((e) => {
				return { label: e.name_fr, value: e.uid };
			});
		}
	});

	$effect(() => {
		if (data && selectedEffector && isConfirmed) {
			effector = data.find((e) => e.uid == selectedEffector?.value);
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
	const getLabel = (effector: Effector) => {
		return `${effector.name_fr}`;
	};

	function compareFn(a: Effector, b: Effector) {
		return a.name_fr.localeCompare(b.name_fr);
	}

	const getEffectorItems = (effectors: Effector[]) => {
		effectors.sort(compareFn);
		return effectors.map((e) => {
			return { value: e.uid, label: getLabel(e) };
		});
	};

	const effectorLabel = (effectors: Effector[]) => {
		return `Effecteur${effectors.length > 1 ? 's' : ''}: ${effectors.length}`;
	};
</script>

<div class="p-4">
	<EffectorTypeSelect bind:selectedEffectorType />
	<FacilitySelect bind:facility bind:department bind:commune bind:facilityCount />
	<div class="grid grid-cols-1 gap-4 variant-ghost p-4">
		{#if isLoading}
			<span>{m.LOADING}</span>
		{:else if error}
			<span>{m.ERROR}: {error.message}</span>
		{:else if data}
			<p>{effectorLabel(data)}</p>
			<Select items={effectorItems} bind:value={selectedEffector} />
		{/if}
	</div>
	<OrganizationRadio bind:memberOfOrg inputClass={inputClass.memberOfOrg} />
			<div class="flex gap-8">
			<div class="w-auto justify-center">
				<button
				    type="button"
					class="variant-filled-secondary btn w-min"
					{disabled}
					onclick={()=>{ isConfirmed = true }}
					>Envoyer</button
				>
			</div>
			<div class="w-auto justify-center">
				<button
					type="button"
					class="variant-filled-error btn w-min"
					onclick={() => {
						selectedEffector = undefined;
						memberOfOrg = undefined;
						showSelectEffectorForm = false;
					}}>Annuler</button
				>
			</div>
		</div>
</div>

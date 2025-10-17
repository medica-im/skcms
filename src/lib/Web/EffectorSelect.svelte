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
	import { getEffectors } from '../../effector.remote.ts';
	import { getEntries } from '$lib/store/directoryStore';

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
	const entries = $derived(await getEntries());
	const effectors = $derived(await getEffectors());
    const filteredEffectors = $derived.by(() => {
		if (effectors) {
		    return effectors.filter((e) => {
				if (!selectedEffectorType) {
					return true
				} else {
					const _type = selectedEffectorType.value;
					console.log(_type);
					const effectorUids = entries.filter(e=>e.effector_type.uid==_type).map(e=>e.effector_uid);
					return effectorUids.includes(e.uid)
				}
		})
		} else {
			return []
		}
	});

    const effectorItems = $derived.by(async () => {
		return filteredEffectors.map((e) => {return {label: e.name_fr, value: e.uid}})
	}
	);

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

	let disabled: boolean = $derived(memberOfOrg==undefined ||selectedEffector==undefined);

	/**
	 * Validate radio memberOfOrg input.
	 */
	$effect(() => {
		if (memberOfOrg==undefined) {
			inputClass.memberOfOrg = inputError;
			validateForm.memberOfOrg = false;
		} else {
			validateForm.memberOfOrg = true;
			inputClass.memberOfOrg = '';
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
	const confirm = () => {
		if (!(selectedEffector==undefined)) {
			const uid = selectedEffector.value
			effector = effectors.find((e) => e.uid==uid)
		}
	}
</script>

<div class="p-4">
	<EffectorTypeSelect bind:selectedEffectorType />
	<FacilitySelect bind:selectedFacility={facility} bind:department bind:commune bind:facilityCount />
	<div class="grid grid-cols-1 gap-4 variant-ghost p-4">
			<p>{effectorLabel(filteredEffectors)}</p>
			<Select items={await effectorItems} bind:value={selectedEffector} />
	</div>
	<OrganizationRadio bind:memberOfOrg inputClass={inputClass.memberOfOrg} />
			<div class="flex gap-8">
				memberOfOrg: {memberOfOrg} selectedEffector: {Boolean(selectedEffector)}
			<div class="w-auto justify-center">
				<button
				    type="button"
					class="variant-filled-secondary btn w-min"
					{disabled}
					onclick={confirm}
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

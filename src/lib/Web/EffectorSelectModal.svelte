<script lang="ts">
	import {
		faPlus,
		faCheck,
		faWindowClose,
		faPenToSquare,
		faExclamationCircle,
		faTrashCanArrowUp,
		faMagnifyingGlass
	} from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import Dialog from '$lib/Web/Dialog.svelte';

	import { page } from '$app/state';
	import * as m from '$msgs';
	import Select from 'svelte-select';
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
	}: {
		effector: Effector | undefined;
		memberOfOrg: boolean | undefined;
	} = $props();

	let isMember: boolean | undefined = $state();
	const defaultDpt: SelectType = {
		label: page.data.organization.department.name,
		value: page.data.organization.department.code
	};
	let isConfirmed: boolean = $state(false);
	let selectedEffector: SelectType | undefined = $state();
	let selectedEffectorType: SelectType | undefined = $state();
	let facility: SelectType | undefined = $state();
	let department: SelectType | undefined = $state(defaultDpt);
	let departmentCode: string | undefined = $derived(department?.value);
	let communes: CreateQueryResult<Commune[], Error> | undefined = $state();
	let commune: SelectType | undefined = $state();
	let communeUid: string | undefined = $derived(commune?.value);
	let facilityCount: number = $state(0);
	const entries = $derived(await getEntries());
	const effectors = $derived(await getEffectors(page.data.directory.name));
	const filteredEffectors = $derived.by(() => {
		if (effectors) {
			return effectors.filter((e) => {
				if (!selectedEffectorType) {
					return true;
				} else {
					const _type = selectedEffectorType.value;
					console.log(_type);
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
			});
		} else {
			return [];
		}
	});

	const effectorItems = $derived.by(() => {
		return filteredEffectors.map((e) => {
			return { label: e.name_fr, value: e.uid };
		});
	});

	interface InputClass {
		effector: string;
		isMember: string;
	}
	interface ValidateForm {
		effector: boolean;
		isMember: boolean;
	}
	const inputError = 'input-error';

	const validateForm: ValidateForm = $state({
		effector: false,
		isMember: false
	});
	const inputClass: InputClass = $state({
		effector: '',
		isMember: ''
	});

	let disabled: boolean = $derived(isMember == undefined || selectedEffector == undefined);
	let dialog: HTMLDialogElement | undefined = $state();
	/**
	 * Validate radio isMember input.
	 */
	$effect(() => {
		if (isMember == undefined) {
			inputClass.isMember = inputError;
			validateForm.isMember = false;
		} else {
			validateForm.isMember = true;
			inputClass.isMember = '';
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
		return `Personne${effectors.length > 1 ? 's' : ''}: ${effectors.length}`;
	};
	const confirm = () => {
		if (!(selectedEffector == undefined)) {
			const uid = selectedEffector.value;
			effector = effectors.find((e) => e.uid == uid);
		}
		memberOfOrg = isMember;
		dialog?.close();
	};
</script>

<button
	onclick={async () => {
		dialog?.showModal();
	}}
	class="btn variant-ghost-surface"
	title="Sélectionner une personne"><span><Fa icon={faMagnifyingGlass} /></span><span>Sélectionner une personne</span></button
>

<Dialog bind:dialog on:close={() => console.log('closed')}>
	<div class="grid grid-cols-1 rounded-lg h-full w-fit p-4 variant-ghost-secondary items-center gap-4">
		effectors: {effectors}<br>
		<div class="place-items-center">
		<h3 class="h3">Sélectionner une personne</h3>
		</div>
		<EffectorTypeSelect bind:selectedEffectorType />
		<FacilitySelect
			bind:selectedFacility={facility}
			bind:department
			bind:commune
			bind:facilityCount
		/>
		<div class="grid grid-cols-1 gap-4 variant-ghost p-4">
			<p>{effectorLabel(filteredEffectors)}</p>
			<Select items={effectorItems} bind:value={selectedEffector} placeholder="Sélectionner une personne" />
		</div>
		<OrganizationRadio bind:data={isMember} inputClass={inputClass.isMember} />
		<div class="flex gap-8">
			<!--isMember: {isMember} selectedEffector: {Boolean(selectedEffector)}-->
			<div class="w-auto justify-center">
				<button
					type="button"
					class="variant-filled-secondary btn w-min"
					{disabled}
					onclick={confirm}>Confirmer</button
				>
			</div>
			<div class="w-auto justify-center">
				<button
					type="button"
					class="variant-filled-error btn w-min"
					onclick={() => {
						selectedEffector = undefined;
						memberOfOrg = undefined;
						dialog?.close()
					}}>Annuler</button
				>
			</div>
		</div>
	</div>
</Dialog>

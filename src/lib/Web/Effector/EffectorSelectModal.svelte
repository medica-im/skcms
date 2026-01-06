<script lang="ts">
	import {
		faMagnifyingGlass
	} from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import Dialog from '$lib/Web/Dialog.svelte';

	import { page } from '$app/state';
	import * as m from '$msgs';
	import Select from 'svelte-select';
	import EffectorTypeSelect from '../EffectorTypeSelect.svelte';
	import FacilitySelect from '../FacilitySelect.svelte';
	import OrganizationRadio from '../OrganizationRadio.svelte';
	import { getEffectors } from '../../../effector.remote.ts';
	import type { CreateQueryResult } from '@tanstack/svelte-query';
	import type { Commune, DepartmentOfFrance, FacilityV2 } from '$lib/interfaces/v2/facility.ts';
	import type { Effector } from '$lib/interfaces/v2/effector.ts';
	import type { SelectType } from '$lib/interfaces/select.ts';
	import type { Entry } from '$lib/store/directoryStoreInterface.ts';
	import { validateIsMember } from './validate.ts';

	let {
		effector = $bindable(),
		memberships = $bindable(),
	}: {
		effector: Effector | undefined;
		memberships: SelectType[];
	} = $props();

	let isSuperUser = $derived(page.data?.user?.role == 'superuser');
	let isMember: boolean | undefined = $state();
	const defaultDpt: SelectType = {
		label: page.data.organization.department.name,
		value: page.data.organization.department.code
	};
	let isConfirmed: boolean = $state(false);
	let selectedEffector: SelectType | undefined = $state();
	let selectedEffectorType: SelectType | undefined = $state();
	let facility: SelectType | undefined = $state();
	let department: SelectType | undefined = $state();
	let departmentCode: string | undefined = $derived(department?.value);
	let commune: SelectType | undefined = $state();
	let communeUid: string | undefined = $derived(commune?.value);
	let facilityCount: number = $state(0);
	const entries: Entry[] = $derived(page.data.entries);
	let directory = $derived(isSuperUser ? null : page.data.directory?.name);
	const effectors = $derived(await getEffectors(directory));
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
	interface IsRequired {
		effector: boolean;
		isMember: boolean;
	}
	const inputError = 'input-error';

	const isRequired: IsRequired = $state({
		effector: true,
		isMember: true,
	});
	let validateForm: ValidateForm = $state({
		effector: false,
		isMember: false
	});
	let inputClass: InputClass = $state({
		effector: '',
		isMember: ''
	});

	let disabled: boolean = $derived(isMember == undefined || selectedEffector == undefined);
	let dialog: HTMLDialogElement | undefined = $state();
	
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
	function confirm() {
		if (selectedEffector !== undefined) {
			const uid = selectedEffector.value;
			effector = effectors.find((e) => e.uid == uid);
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
		dialog?.close();
	};
	const validateAll = () => {
		validateIsMember(isMember, inputClass,isRequired, validateForm);
	};
</script>

<button
	onclick={() => {
		selectedEffectorType=undefined;
		facility=undefined;
		department=undefined;
		commune=undefined;
		isMember=undefined;
		validateAll();
		dialog?.showModal();
	}}
	class="btn variant-ghost-surface"
	title="Sélectionner une personne"><span><Fa icon={faMagnifyingGlass} /></span><span>Sélectionner une personne</span></button
>
<Dialog bind:dialog on:close={() => console.log('closed')}>
	<div class="grid grid-cols-1 rounded-lg h-full w-full p-4 variant-ghost-secondary items-center gap-4">
		<div class="place-items-center">
		<h3 class="h3">Sélectionner une personne</h3>
		<p>Si la personne recherchée a déjà une entrée dans l'annuaire, vous pouvez affiner la recherche en sélectionnant sa catégorie, sa localisation ou son établissement.</p>
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
			<Select items={effectorItems} hasError={selectedEffector ? false: true} bind:value={selectedEffector} placeholder="Sélectionner une personne" />
		</div>
		<OrganizationRadio bind:isMember bind:inputClass bind:validateForm {isRequired} />
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
						dialog?.close()
					}}>Annuler</button
				>
			</div>
		</div>
	</div>
</Dialog>

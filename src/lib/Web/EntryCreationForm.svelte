<script lang="ts">
	import { createEntry } from '../../entry.remote.ts';
	import { invalidateAll } from '$app/navigation';
	import Fa from 'svelte-fa';
	import { faUser } from '@fortawesome/free-regular-svg-icons';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import * as m from '$msgs';
	import DisplayFacility from '$lib/Web/DisplayFacility.svelte';
	import DisplayEntry from '$lib/Web/DisplayEntry.svelte';
	import type { Effector } from '$lib/interfaces/v2/effector.ts';
	import type { SelectType } from '$lib/interfaces/select.ts';

	let {
		createdEffector = $bindable(),
		selectedFacility = $bindable(),
		selectedEffectorType = $bindable(),
		memberships,
	}: {
		createdEffector: Effector|undefined;
		selectedFacility: SelectType|undefined;
		selectedEffectorType: SelectType|undefined;
		memberships: SelectType[];
	} = $props();

	interface InputClass {
		effector: string;
		effector_type: string;
		facility: string;
		organization: string;
		directory: string;
	}
	interface ValidateForm {
		effector: boolean;
		effector_type: boolean;
		facility: boolean;
		organization: boolean;
		directory: boolean;
	}
	const inputError = 'input-error';
	const inputClass: InputClass = $state({
		effector: '',
		effector_type: '',
		facility: '',
		organization: '',
		directory: '',
	});
	const validateForm: ValidateForm = $state({
		effector: false,
		effector_type: true,
		facility: true,
		organization: true,
		directory: true,
	});
	const isSuperUser = $derived(page.data?.user?.role == 'superuser');
	let effector: string|undefined = $derived(createdEffector?.uid);
	let effector_type: string|undefined = $derived(selectedEffectorType?.value);
	let facility: string|undefined = $derived(selectedFacility?.value);
	let organizations: string | null = $derived(memberships ? JSON.stringify(memberships) : null); // TODO: make this an array
	let directory: string | undefined = $state();
	let uid = $derived.by(()=>{
		if (effector && effector_type && facility ) {
			return effector.concat(effector_type,facility)
		} else {
			return ""
		}
	});
	let formResult = $derived(createEntry.for(uid)?.result);
	let disabled: boolean = $derived(!Object.values(validateForm).every((v) => v === true) || formResult?.success==true);
	let hasBeenClicked = false;

	const effectorIsValid = (value: string) => {
		return true;
	};
	const effectorTypeIsValid = (value: string) => {
		return true;
	};
	const facilityIsValid = (value: string) => {
		return true;
	};
	const directoryIsValid = (value: string) => {
		return true;
	};
	/**
	 * Validate effector input.
	 */
	$effect(() => {
		if (effector && effectorIsValid(effector)) {
			validateForm.effector = true;
			inputClass.effector = '';
		} else {
			inputClass.effector = inputError;
			validateForm.effector = false;
		}
	});
	/**
	 * Validate effector_type input.
	 */
	$effect(() => {
		if (effector_type && effectorTypeIsValid(effector_type)) {
			inputClass.effector_type = '';
			validateForm.effector_type = true;
		} else {
			inputClass.effector_type = inputError;
			validateForm.effector_type = false;
		}
	});
	/**
	 * Validate facility input.
	 */
	$effect(() => {
		if (facility && facilityIsValid(facility)) {
			inputClass.facility = '';
			validateForm.facility = true;
		} else {
			inputClass.facility = inputError;
			validateForm.facility = false;
		}
	});
		/**
	 * Validate directory input.
	 */
	$effect(() => {
		if (!directory || directory && directoryIsValid(directory)) {
			inputClass.facility = '';
			validateForm.facility = true;
		} else {
			inputClass.facility = inputError;
			validateForm.facility = false;
		}
	});
	const  clear = () => {
		formResult = undefined;
		createdEffector = undefined;
		selectedFacility = undefined;
		selectedEffectorType = undefined;
		directory = undefined;
	};
	function handleClick() {
        if (hasBeenClicked) return;
        
        hasBeenClicked = true;
        setTimeout(() => {
            hasBeenClicked = false;
        }, 500);
        
        console.log('click');
    };
</script>
<!--formResult?.success: {formResult?.success}<br>
formResult?.data: {formResult?.data}<br>
selectedFacility: {JSON.stringify(selectedFacility)}-->
	<div class="rounded-lg p-4 variant-ghost-secondary gap-2 items-center place-items-center">
		<form {...createEntry.for(uid)}
			class=""
		>
			<div class="p-2 space-y-4 justify-items-stretch gap-6">
				<div class="p-2 space-y-2 w-full">
					<label class="flex label place-self-start place-items-center space-x-2 w-full">
						<span>Personne:</span>
						<input
							oninput={() => {}}
							class="hidden input {inputClass.effector}"
							name="effector"
							type="text"
							placeholder=""
							bind:value={effector}
						/>
						<div class="badge variant-ghost-surface">{createdEffector?.name_fr}</div>
					</label>
					<label class="flex label place-self-start place-items-center space-x-2 w-full">
						<span>Catégorie:</span>
						<input
							oninput={() => {}}
							class="input hidden {inputClass.effector_type}"
							name="effector_type"
							type="text"
							placeholder=""
							bind:value={effector_type}
						/>
						<div class="badge variant-ghost-surface">{selectedEffectorType?.label}</div>
					</label>
					<label class="flex label place-self-start place-items-center space-x-2 w-full">
						<span>Établissement:</span>
						<input
							oninput={() => {}}
							class="input hidden {inputClass.facility}"
							name="facility"
							type="text"
							placeholder=""
							bind:value={facility}
						/>
					</label>
					{#if facility}
					<DisplayFacility facilityUid={facility} showEffectors={false} />
					{/if}
					<label class="flex label place-self-start place-items-center space-x-2 w-full">
						<span>Organisation:</span>
						<input
							oninput={() => {}}
							class="input hidden {inputClass.organization}"
							name="organizations"
							type="text"
							placeholder=""
							value={memberships ? memberships.map(e=>e.value) : []}
						/>
						{#if memberships.length}
						{#each memberships as membership}
						<div class="badge variant-ghost-surface">{membership.label}</div>
						{/each}
						{:else}
						<div class="badge variant-ghost-surface">∅</div>
						{/if}
					</label>
					<input
							class="hidden"
							name="organization_category"
							type="text"
							placeholder=""
							value={page.data.organization.category.name}
						/>
						{#if isSuperUser}
					<label class="flex label place-self-start place-items-center space-x-2 w-full">
						<span>Annuaire</span>
						<input
							oninput={() => {}}
							class="input {inputClass.directory}"
							name="directory"
							type="text"
							placeholder=""
							bind:value={directory}
						/>
					</label>
					{/if}
				</div>
			</div>
			<div class="flex gap-8">
				<div class="w-auto justify-center">
					<button type="submit" class="variant-filled-secondary btn w-min" {disabled} onclick={handleClick}
						>Confirmer</button
					>
				</div>
				<div class="w-auto justify-center">
					<button
						type="button"
						class="variant-filled-error btn w-min"
						onclick={() => {clear();
						}}>Annuler</button
					>
				</div>
			</div>
		</form>
	</div>

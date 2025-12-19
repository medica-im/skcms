<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import Dialog from '$lib/Web/Dialog.svelte';
	import { createEffector } from '../../../effector.remote.ts';
	import Fa from 'svelte-fa';
	import { faPlus, faCheck, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
	import OrganizationRadio from './../OrganizationRadio.svelte';
	import { slugify } from '$lib/helpers/stringHelpers';
	import {
		validateName,
		validateLabel,
		validateSlug,
		validateGender,
		validateIsMember,
	} from './validate.ts';
	import type { InputClass, IsRequired, ValidateForm } from './validate.ts';
	import type { Effector } from '$lib/interfaces/v2/effector.ts';
	import type { SelectType } from '$lib/interfaces/select';

	let {
		createdEffector = $bindable(),
		memberships = $bindable()
	}: {
		createdEffector: Effector | undefined;
		memberships: SelectType[];
	} = $props();

	let isMember: boolean | undefined = $state();
	let dialog: HTMLDialogElement | undefined = $state();
	let inputClass: InputClass = $state({
		name_fr: '',
		label_fr: '',
		slug_fr: '',
		gender: '',
		isMember: ''
	});
	const isRequired: IsRequired = {
		name_fr: true,
		label_fr: false,
		slug_fr: true,
		gender: true,
		isMember: true,
	};
	let validateForm: ValidateForm = $state({
		name_fr: !isRequired.name_fr,
		label_fr: !isRequired.name_fr,
		slug_fr: !isRequired.slug_fr,
		gender: !isRequired.gender,
		isMember: !isRequired.isMember
	});
	let name_fr: string = $state('');
	let label_fr: string = $state('');
	let slug_fr: string = $derived.by(()=>{
		return slugify(name_fr)
	});
	let gender: string|undefined = $state();
	let formResult = $derived(createEffector.result);
	let disabled: boolean = $derived(
		!Object.values(validateForm).every((v) => v === true) || formResult?.success == true
	);

	function addOrgMembership() {
		if ( isMember ) {
			const orgItem = {
				label: page.data.organization.name,
				value: page.data.organization.uid
			};
			if (memberships.indexOf(orgItem) === -1) {
				memberships.push(orgItem);
			}
		}
	}
	const validateAll = () => {
		validateName(name_fr, inputClass, isRequired, validateForm);
		validateLabel(label_fr, inputClass, isRequired, validateForm);
		validateSlug(slug_fr, inputClass, isRequired, validateForm);
		validateGender(gender, inputClass, isRequired, validateForm);
		validateIsMember(isMember, inputClass, isRequired, validateForm);
	}
	onMount(() => {
		validateAll();
	});
	const clear = () => {
		formResult = undefined;
		createdEffector = undefined;
		isMember = undefined;
		name_fr = "";
		label_fr = "";
		gender = undefined;
		validateAll();
	};
</script>

<button
	onclick={() => {
		clear();
		dialog?.showModal();
	}}
	class="btn variant-ghost-surface"
	title="Créer"><span><Fa icon={faPlus} /></span><span>Créer une personne</span></button
>
<Dialog bind:dialog>
	<div class="rounded-lg w-full p-4 variant-ghost-secondary items-center place-items-center">
		<div class="rounded-lg p-6 variant-ghost-secondary space-y-6 items-center place-items-center">
			<h3 class="h3 text-center">Créer une nouvelle personne physique ou morale</h3>
			<div class="p-4 space-y-2 justify-items-stretch grid grid-cols-1 gap-6">
				<form
					{...createEffector}
					class=""
				>
					<label class="flex label place-self-start place-items-center space-x-2 w-full">
						<span>Nom</span>
						{#each createEffector.fields.name_fr.issues() as issue}
							<p class="issue">{issue.message}</p>
						{/each}
						<input
							class="input {inputClass.name_fr}"
							name="name_fr"
							type="text"
							placeholder=""
							bind:value={name_fr}
							oninput={() => {
								validateName(name_fr, inputClass, isRequired, validateForm);
								validateSlug(slug_fr, inputClass, isRequired, validateForm);
							}}
						/>
					</label>
					<label class="flex label place-self-start place-items-center space-x-2 w-full">
						<span>Label</span>
						{#each createEffector.fields.label_fr.issues() as issue}
							<p class="issue">{issue.message}</p>
						{/each}
						<input
							class="input {inputClass.label_fr}"
							name="label_fr"
							type="text"
							placeholder=""
							bind:value={label_fr}
							oninput={() => {
								validateLabel(label_fr, inputClass, isRequired, validateForm);
							}}
						/>
					</label>
					<label class="flex label place-self-start place-items-center space-x-2 w-full">
						<span>Slug</span>
						{#each createEffector.fields.slug_fr.issues() as issue}
							<p class="issue">{issue.message}</p>
						{/each}
						<input
							class="input {inputClass.slug_fr}"
							name="slug_fr"
							type="text"
							placeholder=""
							bind:value={slug_fr}
							oninput={() => {
								validateSlug(slug_fr, inputClass, isRequired, validateForm);
							}}
						/>
					</label>
					<label class="flex label place-self-start place-items-center space-x-2 w-full">
						<span>Genre grammatical</span>
						<!--input
							oninput={() => {}}
							class="input {inputClass.gender}"
							name="gender"
							type="text"
							placeholder=""
							bind:value={gender}
						/-->
						{#each createEffector.fields.gender.issues() as issue}
							<p class="issue">{issue.message}</p>
						{/each}
						<select
							class="select {inputClass.gender} w-min"
							name="gender"
							size="3"
							bind:value={gender}
							oninput={() => {
								validateGender(gender, inputClass, isRequired, validateForm);
							}}
						>
							<option value="F">Féminin</option>
							<option value="M">Masculin</option>
							<option value="N">Neutre</option>
						</select>
					</label>
					<OrganizationRadio bind:isMember bind:inputClass bind:validateForm {isRequired} />
					<div class="flex gap-8">
						<div class="flex gap-2 items-center">
							{#if formResult?.success}
								<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
							{:else if formResult && formResult.success == false}
								<span class="badge-icon variant-filled-error"
									><Fa icon={faExclamationCircle} /></span
								>{formResult.text}
							{/if}
						</div>
						<div class="w-auto justify-center">
							<button
								type="submit"
								class="variant-filled-secondary btn w-min"
								{disabled}
								>Envoyer</button
							>
						</div>
						<div class="w-auto justify-center">
							<button
								type="button"
								class="variant-filled-error btn w-min"
								onclick={() => {
									createdEffector = formResult?.data;
									addOrgMembership();
									dialog?.close();
								}}>{formResult?.success ? 'Fermer' : 'Annuler'}</button
							>
						</div>
					</div>
				</form>
			</div>
		</div>
	</div>
</Dialog>
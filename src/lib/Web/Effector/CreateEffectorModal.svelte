<script lang="ts">
	import Dialog from '$lib/Web/Dialog.svelte';
	import { createEffector } from '../../../effector.remote.ts';
	import Fa from 'svelte-fa';
	import { faPlus, faCheck, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
	import OrganizationRadio from './../OrganizationRadio.svelte';
	import { slugify } from '$lib/helpers/stringHelpers';
	import type { Effector } from '$lib/interfaces/v2/effector.ts';

	let {
		memberOfOrg = $bindable(),
		createdEffector = $bindable(),
		top = $bindable()
	}: {
		memberOfOrg: boolean | undefined;
		createdEffector: Effector | undefined;
		top: Element | undefined;
	} = $props();

	interface InputClass {
		name_fr: string;
		label_fr: string;
		slug_fr: string;
		gender: string;
		isMember: string;
	}
	interface ValidateForm {
		name_fr: boolean;
		label_fr: boolean;
		slug_fr: boolean;
		gender: boolean;
		isMember: boolean;
	}
	let isMember: boolean | undefined = $state();
	let dialog: HTMLDialogElement | undefined = $state();
	const inputError = 'input-error';
	const inputClass: InputClass = $state({
		name_fr: '',
		label_fr: '',
		slug_fr: '',
		gender: '',
		isMember: ''
	});
	const validateForm: ValidateForm = $state({
		name_fr: false,
		label_fr: true,
		slug_fr: true,
		gender: true,
		isMember: false
	});
	let name_fr: string = $state('');
	let label_fr: string = $state('');
	let slug_fr: string = $derived(slugify(name_fr));
	let gender: string = $state('');
	let formResult = $derived(createEffector.result);
	let disabled: boolean = $derived(
		!Object.values(validateForm).every((v) => v === true) || formResult?.success == true
	);

	const nameIsValid = (value: string) => {
		return true;
	};
	const labelIsValid = (value: string) => {
		return true;
	};
	const slugIsValid = (value: string) => {
		const regexpSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
		return regexpSlug.test(value);
	};
	/**
	 * Validate name input.
	 */
	$effect(() => {
		if (name_fr && nameIsValid(name_fr)) {
			validateForm.name_fr = true;
			inputClass.name_fr = '';
		} else {
			inputClass.name_fr = inputError;
			validateForm.name_fr = false;
		}
	});
	/**
	 * Validate label input.
	 */
	$effect(() => {
		if (!label_fr) {
			return;
		} else if (label_fr && labelIsValid(label_fr)) {
			inputClass.label_fr = '';
			validateForm.label_fr = true;
		} else {
			inputClass.label_fr = inputError;
			validateForm.label_fr = false;
		}
	});
	/**
	 * Validate slug input.
	 */
	$effect(() => {
		if (slug_fr && slugIsValid(slug_fr)) {
			inputClass.slug_fr = '';
			validateForm.slug_fr = true;
		} else {
			inputClass.slug_fr = inputError;
			validateForm.slug_fr = false;
		}
	});
	/**
	 * Validate radio isMember input.
	 */
	$effect(() => {
		if (isMember != undefined) {
			validateForm.isMember = true;
			inputClass.isMember = '';
		} else {
			inputClass.isMember = inputError;
			validateForm.isMember = false;
		}
	});
</script>

<button
	onclick={async () => {
		formResult = undefined;
		createdEffector = undefined;
		isMember = undefined;
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
					{...createEffector.enhance(async ({ form, data, submit }) => {
						console.log(data);
						try {
							await submit();
							console.log('Successfully published!');
						} catch (error) {
							console.log(`Oh no! Something went wrong:${error}`);
						}
					})}
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
						>
							<option value="F">Féminin</option>
							<option value="M">Masculin</option>
							<option value="N">Neutre</option>
						</select>
					</label>
					<OrganizationRadio bind:data={isMember} inputClass={inputClass.isMember} />
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
									memberOfOrg = isMember;
									top?.scrollIntoView();
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
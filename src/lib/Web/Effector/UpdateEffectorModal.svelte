<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidate } from '$app/navigation';
	import Dialog from '$lib/Web/Dialog.svelte';
	import { updateEffector } from '../../../effector.remote.ts';
	import Fa from 'svelte-fa';
	import { faCheck, faExclamationCircle, faPenToSquare } from '@fortawesome/free-solid-svg-icons';
	import { validateName, validateLabel, validateSlug, validateGender } from './validate.ts';
	import type { EntryFull } from '$lib/store/directoryStoreInterface.ts';
	import type {
		InputClassUpdate as InputClass,
		IsRequiredUpdate as IsRequired,
		ValidateFormUpdate as ValidateForm
	} from './validate.ts';

	let {
		data
	}: {
		data: EntryFull;
	} = $props();

	let dialog: HTMLDialogElement | undefined = $state();
	const inputClass: InputClass = $state({
		name_fr: '',
		label_fr: '',
		slug_fr: '',
		gender: ''
	});
	const isRequired: IsRequired = {
		name_fr: true,
		label_fr: false,
		slug_fr: true,
		gender: true
	};
	const validateForm: ValidateForm = $state({
		name_fr: !isRequired.name_fr,
		label_fr: !isRequired.label_fr,
		slug_fr: !isRequired.slug_fr,
		gender: !isRequired.gender
	});
	let name_fr: string = $state(data.name);
	let label_fr: string = $state(data.label);
	let slug_fr: string = $state(data.slug);
	let gender: string | null = $state(data.gender);
	let formResult = $derived(updateEffector.for(data.effector_uid).result);
	let isModified: boolean = $derived(
		name_fr != data.name || label_fr != data.label || slug_fr != data.slug || gender != data.gender
	);
	let disabled: boolean = $derived(!!updateEffector.for(data.effector_uid).pending ||
		!Object.values(validateForm).every((v) => v === true) ||
			formResult?.success == true ||
			!isModified
	);
	const validateAll = () => {
		validateName(name_fr, inputClass, isRequired, validateForm);
		validateLabel(label_fr, inputClass, isRequired, validateForm);
		validateSlug(slug_fr, inputClass, isRequired, validateForm);
		validateGender(gender, inputClass, isRequired, validateForm);
	};
	onMount(() => {
		validateAll();
	});
</script>
<!--
{form}<br />
{JSON.stringify(form)}<br />
{form?.status}<br />
{form?.type}
-->
<button
	onclick={async () => {
		formResult = undefined;
		dialog?.showModal();
	}}
	class="btn-icon"
	title="Modifier"><Fa icon={faPenToSquare} /></button
>

<Dialog bind:dialog classProp="w-full">
	<div class="rounded-lg w-full p-4 variant-ghost-secondary items-center place-items-center">
		<div class="rounded-lg p-6 variant-ghost-secondary space-y-6 items-center place-items-center">
			<h3 class="h3 text-center">Modifier la personne physique ou morale</h3>
			<div class="p-4 space-y-2 justify-items-stretch grid grid-cols-1 gap-6">
				<form
					{...updateEffector.for(data.effector_uid).enhance(async ({ form, data, submit }) => {
						console.log(data);
						try {
							await submit();
							console.log('Successfully published!');
							invalidate('entry:now');
						} catch (error) {
							console.log(`Oh no! Something went wrong:${error}`);
						}
					})}
					class=""
				>
					<input
						class="hidden"
						name="effector"
						type="text"
						placeholder=""
						bind:value={data.effector_uid}
					/>
					<label class="flex label place-self-start place-items-center space-x-2 w-full">
						<span class="h4">Nom</span>
						{#each updateEffector.for(data.effector_uid).fields.name_fr.issues() as issue}
							<p class="issue">{issue.message}</p>
						{/each}
						<input
							class="text-base input {inputClass.name_fr}"
							name="name_fr"
							type="text"
							placeholder=""
							bind:value={name_fr}
							oninput={() => {
								validateName(name_fr, inputClass, isRequired, validateForm);
							}}
						/>
					</label>
					<label class="flex label place-self-start place-items-center space-x-2 w-full">
						<span class="h4">Label</span>
						{#each updateEffector.for(data.effector_uid).fields.label_fr.issues() as issue}
							<p class="issue">{issue.message}</p>
						{/each}
						<input
							class="text-base input {inputClass.label_fr}"
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
						<span class="h4">Slug</span>
						{#each updateEffector.for(data.effector_uid).fields.slug_fr.issues() as issue}
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
						<span class="h4">Genre grammatical</span>
						<!--input
							oninput={() => {}}
							class="input {inputClass.gender}"
							name="gender"
							type="text"
							placeholder=""
							bind:value={gender}
						/-->
						{#each updateEffector.for(data.effector_uid).fields.gender.issues() as issue}
							<p class="issue">{issue.message}</p>
						{/each}
						<select
							class="select {inputClass.gender} w-min"
							name="gender"
							size="3"
							bind:value={gender}
							onchange={() => {
								validateGender(gender, inputClass, isRequired, validateForm);
							}}
						>
							<option value="F">Féminin</option>
							<option value="M">Masculin</option>
							<option value="N">Neutre</option>
						</select>
					</label>
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
								onclick={async () => {
									await new Promise((resolve) => setTimeout(resolve, 1000));
								}}>Envoyer</button
							>
						</div>
						<div class="w-auto justify-center">
							<button
								type="button"
								class="variant-filled-error btn w-min"
								onclick={() => {
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

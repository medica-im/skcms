<script lang="ts">
	import * as m from '$msgs';
	import { page } from '$app/state';
	import { onMount, untrack } from 'svelte';
	import { FIXED_GENDER, gendersFor, professionWords, type Gender } from './gender.ts';
	import GenderHint from './GenderHint.svelte';
	import Dialog from '$lib/Web/Dialog.svelte';
	import { updateEffector } from '../../../effector.remote.ts';
	import Fa from 'svelte-fa';
	import { faCheck, faExclamationCircle, faPenToSquare } from '@fortawesome/free-solid-svg-icons';
	import { validateName, validateLabel, validateGender } from './validate.ts';
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
		gender: ''
	});
	const isRequired: IsRequired = {
		name_fr: true,
		label_fr: false,
		gender: true
	};
	const validateForm: ValidateForm = $state({
		name_fr: !isRequired.name_fr,
		label_fr: !isRequired.label_fr,
		gender: !isRequired.gender
	});
	const genders = $derived(gendersFor(data.effector_type?.nature));
	const words = $derived(professionWords(page.data.labels, data.effector_type?.uid));
	const genderName: Partial<Record<Gender, () => string>> = { F: m.EFFECTOR_GENDER_F, M: m.EFFECTOR_GENDER_M };
	const initialGender: string | null = untrack(() =>
		genders.length ? (genders.includes(data.gender as Gender) ? data.gender : null) : (data.gender ?? FIXED_GENDER)
	);
	let name_fr: string = $state(data.name);
	let label_fr: string = $state(data.label);
	let gender: string | null = $state(initialGender);
	let formResult = $derived(updateEffector.for(data.effector_uid).result);
	let isModified: boolean = $derived(
		name_fr != data.name || label_fr != data.label || gender != initialGender
	);
	let disabled: boolean = $derived(!!updateEffector.for(data.effector_uid).pending ||
		!Object.values(validateForm).every((v) => v === true) ||
			formResult?.success == true ||
			!isModified
	);
	const validateAll = () => {
		validateName(name_fr, inputClass, isRequired, validateForm);
		validateLabel(label_fr, inputClass, isRequired, validateForm);
		validateGender(gender, inputClass, isRequired, validateForm);
	};
	onMount(() => {
		validateAll();
	});
</script>
<button
	onclick={async () => {
		formResult = undefined;
		dialog?.showModal();
	}}
	class="btn-icon min-h-11 min-w-11"
	title={m.EFFECTOR_EDIT_PERSON()}
	aria-label={m.EFFECTOR_EDIT_PERSON()}><Fa icon={faPenToSquare} /></button
>

<Dialog bind:dialog classProp="w-[90vw] sm:w-[32rem]">
	<div class="p-6 space-y-4" data-testid="effector-edit-dialog">
		<h2 class="h3">Modifier la personne physique ou morale</h2>
		<form
			{...updateEffector.for(data.effector_uid).enhance(async ({ submit }) => {
				try {
					await submit();
				} catch (error) {
					console.log(`Oh no! Something went wrong:${error}`);
				}
			})}
			class="space-y-4"
		>
			<input
				class="hidden"
				name="effector"
				type="text"
				placeholder=""
				value={data.effector_uid}
			/>
			<label class="label">
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
			<label class="label">
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
			{#if genders.length}
				<div class="space-y-2">
					<label class="label">
						<span class="h4">{m.EFFECTOR_GENDER_LABEL()}</span>
						{#each updateEffector.for(data.effector_uid).fields.gender.issues() as issue}
							<p class="issue">{issue.message}</p>
						{/each}
						<select
							class="select {inputClass.gender} w-min"
							name="gender"
							size={genders.length}
							bind:value={gender}
							onchange={() => {
								validateGender(gender, inputClass, isRequired, validateForm);
							}}
						>
							{#each genders as g (g)}
								<option value={g}>{genderName[g]?.()}</option>
							{/each}
						</select>
					</label>
					<GenderHint {words} {gender} />
				</div>
			{:else}
				<input type="hidden" name="gender" value={gender} />
			{/if}
			<div class="flex flex-wrap items-center justify-end gap-2">
				{#if formResult?.success}
					<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
				{:else if formResult && formResult.success == false}
					<span class="badge-icon variant-filled-error"><Fa icon={faExclamationCircle} /></span>
					<span class="text-sm text-error-700-200-token">{formResult.text}</span>
				{/if}
				<button
					type="button"
					class="btn min-h-11 variant-ghost-surface"
					onclick={() => dialog?.close()}
				>
					{formResult?.success ? m.CLOSE() : m.CANCEL()}
				</button>
				<button type="submit" class="btn min-h-11 variant-filled-primary" {disabled}>
					Envoyer
				</button>
			</div>
		</form>
	</div>
</Dialog>

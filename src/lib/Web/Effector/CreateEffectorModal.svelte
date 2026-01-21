<script lang="ts">
	import * as m from '$msgs';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import Dialog from '$lib/Web/Dialog.svelte';
	import { createEffector } from '../../../effector.remote.ts';
	import Fa from 'svelte-fa';
	import { faPlus, faCheck, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
	import OrganizationRadio from './../OrganizationRadio.svelte';
	import { slugify } from '$lib/helpers/stringHelpers';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
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

	let uuid = $state(self.crypto.randomUUID());
	let result = $derived(createEffector.for(uuid).result);

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
		isMember: false,
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
	let slug_fr: string = $derived(slugify(name_fr));
	let gender: string|undefined = $state();

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
	const clear = () => {
		result = undefined;
		createdEffector = undefined;
		isMember = undefined;
		name_fr = "";
		label_fr = "";
		gender = undefined;
	};
</script>

{#snippet asterisk(formElement: string)}
{#if isRequired[formElement as keyof IsRequired]}<span class="text-error-500">*</span>
{/if}
{/snippet}

<button
	onclick={() => {
		uuid = self.crypto.randomUUID();
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
				<form {...createEffector.for(uuid)}>
					<input
							class="hidden"
							name="organization"
							type="text"
							placeholder=""
							value={page.data.organization.category.name}
						/>
					<label class="flex label place-self-start place-items-center space-x-2 w-full">
						<span>Nom</span>
						{#each createEffector.for(uuid).fields.name_fr.issues() as issue}
							<p class="issue text-error-500">{issue.message}</p>
						{/each}
						<input
							class="input"
							name="name_fr"
							type="text"
							placeholder=""
							bind:value={name_fr}
						/>{@render asterisk("name_fr")}
					</label>
					<label class="flex label place-self-start place-items-center space-x-2 w-full">
						<span>Label</span>
						{#each createEffector.for(uuid).fields.label_fr.issues() as issue}
							<p class="issue text-error-500">{issue.message}</p>
						{/each}
						<input
							class="input"
							name="label_fr"
							type="text"
							placeholder=""
							bind:value={label_fr}
						/>{@render asterisk("label_fr")}
					</label>
					<label class="flex label place-self-start place-items-center space-x-2 w-full">
						<span>{capitalizeFirstLetter(m.slug())}</span>
						{#each createEffector.for(uuid).fields.slug_fr.issues() as issue}
							<p class="issue text-error-500">{issue.message}</p>
						{/each}
						<input
							class="input"
							name="slug_fr"
							type="text"
							placeholder=""
							bind:value={slug_fr}
						/>{@render asterisk("slug_fr")}
					</label>
					<label class="flex label place-self-start place-items-center space-x-2 w-full items-center">
						<span>Genre grammatical</span>
						{#each createEffector.for(uuid).fields.gender.issues() as issue}
							<p class="issue text-error-500">{issue.message}</p>
						{/each}
						<select
							class="select w-min"
							name="gender"
							size="3"
							bind:value={gender}
						>
							<option value="F">Féminin</option>
							<option value="M">Masculin</option>
							<option value="N">Neutre</option>
						</select>{@render asterisk("gender")}
					</label>
					<label class="flex label place-self-start place-items-center space-x-2 w-full">
					<span>Cette personne est-elle membre de {page.data.organization.formatted_name}?</span>
					<div class="flex items-center gap-2">
						<OrganizationRadio bind:isMember bind:inputClass bind:validateForm {isRequired} /><div class="">{@render asterisk("isMember")}</div>
					</div>
					</label>
					<div class="flex gap-8">
						<div class="flex gap-2 items-center">
							{#if result?.success}
								<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
							{:else if result?.success === false}
								<span class="badge-icon variant-filled-error"
									><Fa icon={faExclamationCircle} /></span
								>{result?.data.detail}
							{/if}
						</div>
						<div class="w-auto justify-center">
							<button
								type="submit"
								class="variant-filled-secondary btn w-min"
								disabled={result?.success===true}
								>Envoyer</button
							>
						</div>
						<div class="w-auto justify-center">
							<button
								type="button"
								class="variant-filled-error btn w-min"
								onclick={() => {
									createdEffector = result?.data;
									addOrgMembership();
									dialog?.close();
								}}>{result?.success ? 'Fermer' : 'Annuler'}</button
							>
						</div>
					</div>
				</form>
			</div>
		</div>
	</div>
</Dialog>
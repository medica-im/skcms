<script lang="ts">
	import { createEntry } from '../../entry.remote.ts';
	import Fa from 'svelte-fa';
	import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
	import { faUser } from '@fortawesome/free-regular-svg-icons';
	import { page } from '$app/state';
	import * as m from '$msgs';
	import DisplayFacility from '$lib/Web/DisplayFacility.svelte';
	import type { Effector } from '$lib/interfaces/v2/effector.ts';
	import type { SelectType } from '$lib/interfaces/select.ts';

	let {
		createdEffector = $bindable(),
		selectedFacility = $bindable(),
		selectedEffectorType = $bindable(),
		memberships
	}: {
		createdEffector: Effector | undefined;
		selectedFacility: SelectType | undefined;
		selectedEffectorType: SelectType | undefined;
		memberships: SelectType[];
	} = $props();

	const isSuperUser = $derived(page.data?.user?.role == 'superuser');
	let effector: string | undefined = $derived(createdEffector?.uid);
	let effector_type: string | undefined = $derived(selectedEffectorType?.value);
	let facility: string | undefined = $derived(selectedFacility?.value);
	let directory: string | undefined = $state();
	let uid = $derived.by(() => {
		if (effector && effector_type && facility) {
			return effector.concat(effector_type, facility);
		} else {
			return '';
		}
	});
	let formResult = $derived(createEntry.for(uid)?.result);
	let hasBeenClicked = false;

	const clear = () => {
		formResult = undefined;
		createdEffector = undefined;
		selectedFacility = undefined;
		selectedEffectorType = undefined;
		directory = undefined;
	};
</script>

<!--formResult?.success: {formResult?.success}<br>
formResult?.data: {formResult?.data}<br>
selectedFacility: {JSON.stringify(selectedFacility)}-->
<div class="rounded-lg p-4 variant-ghost-secondary w-full">
	<form {...createEntry.for(uid)/*.enhance(async ({ form, data, submit }) => {
				try {
					//data = manipulateForm(data);
					const dataString = JSON.stringify(data);
					console.log(dataString);
					await submit();
					const result = createEntry.for(uid).result;
					if (result?.redirectURL) {
						window.location.href = result.redirectURL;
					}
				} catch (error) {
					console.log(error);
				}
			})*/} class="space-y-4 w-full">
		<h3 class="h3">Confirmer ou annuler la création de la nouvelle entrée</h3>
		{#if formResult?.success === false}
			<aside class="alert variant-filled-error">
				<!-- Icon -->
				<span class="badge-icon"><Fa size="2x" icon={faExclamationTriangle} /></span>
				<!-- Message -->
				<div class="alert-message">
					<h3 class="h3">Erreur {formResult.status} {formResult.text}</h3>
					<p>{formResult.data?.detail}</p>
				</div>
			</aside>
		{/if}
		<div class="space-y-3 w-full">
			<label class="label w-full">
				<span class="text-sm font-medium">Personne</span>
				<input
					oninput={() => {}}
					class="hidden input"
					name="effector"
					type="text"
					placeholder=""
					bind:value={effector}
				/>
				<div class="badge variant-ghost-surface">{createdEffector?.name_fr}</div>
			</label>
			<label class="label w-full">
				<span class="text-sm font-medium">Catégorie</span>
				<input
					oninput={() => {}}
					class="input hidden"
					name="effector_type"
					type="text"
					placeholder=""
					bind:value={effector_type}
				/>
				<div class="badge variant-ghost-surface">{selectedEffectorType?.label}</div>
			</label>
			<label class="label w-full">
				<span class="text-sm font-medium">Établissement</span>
				<input
					oninput={() => {}}
					class="input hidden"
					name="facility"
					type="text"
					placeholder=""
					bind:value={facility}
				/>
			</label>
			{#if facility}
				<DisplayFacility facilityUid={facility} showEffectors={false} mapHeight={36} update={false} />
			{/if}
			<label class="label w-full">
				<span class="text-sm font-medium">Organisation</span>
				<input
					oninput={() => {}}
					class="input hidden"
					name="memberships"
					type="text"
					placeholder=""
					value={memberships?.length ? memberships.map((e) => e.value) : ''}
				/>
				<div class="flex flex-wrap gap-1">
					{#if memberships.length}
						{#each memberships as membership}
							<div class="badge variant-ghost-surface">{membership.label}</div>
						{/each}
					{:else}
						<div class="badge variant-ghost-surface">∅</div>
					{/if}
				</div>
			</label>
			<input
				class="hidden"
				name="organization_category"
				type="text"
				placeholder=""
				value={page.data.organization.category.name}
			/>
			{#if isSuperUser}
				<label class="label w-full">
					<span class="text-sm font-medium">Annuaire</span>
					<input
						oninput={() => {}}
						class="input w-full"
						name="directory"
						type="text"
						placeholder=""
						bind:value={directory}
					/>
				</label>
			{/if}
		</div>
		<div class="flex gap-4">
			<button
				type="submit"
				class="variant-filled-secondary btn"
				disabled={!!createEntry.for(uid).pending}>Confirmer</button
			>
			<button
				type="button"
				class="variant-filled-error btn"
				onclick={() => {
					clear();
				}}>Annuler</button
			>
		</div>
	</form>
</div>

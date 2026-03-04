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
	import { ProgressRadial } from '@skeletonlabs/skeleton';

	let {
		effector = $bindable(),
		facility = $bindable(),
		effectorType = $bindable(),
		memberships = $bindable(),
		submitted = $bindable(false),
		membershipsDone = $bindable(),
		displayMembershipStep
	}: {
		effector: Effector | undefined;
		facility: SelectType | undefined;
		effectorType: SelectType | undefined;
		memberships: SelectType[];
		submitted?: boolean;
		membershipsDone: boolean;
		displayMembershipStep: boolean;
	} = $props();

	const isSuperUser = $derived(page.data?.user?.role == 'superuser');
	let effectorUid: string | undefined = $derived(effector?.uid);
	let effector_type: string | undefined = $derived(effectorType?.value);
	let facilityUid: string | undefined = $derived(facility?.value);
	let directory: string | undefined = $state();
	let uid = $derived.by(() => {
		if (effectorUid && effector_type && facilityUid) {
			return effectorUid.concat(effector_type, facilityUid);
		} else {
			return '';
		}
	});
	let formResult = $derived(createEntry.for(uid)?.result);
	let hasBeenClicked = false;
	// submitted is now a bindable prop
	const isRedirecting = $derived(submitted && formResult?.success !== false);

	const clear = () => {
		formResult = undefined;
		effector = undefined;
		facility = undefined;
		effectorType = undefined;
		directory = undefined;
		memberships = [];
		membershipsDone = !displayMembershipStep;
	};
</script>

<!--formResult?.success: {formResult?.success}<br>
formResult?.data: {formResult?.data}<br>
facility: {JSON.stringify(facility)}-->
{#if isRedirecting}
	<div class="rounded-lg p-8 variant-ghost-secondary w-full flex flex-col items-center gap-6">
		<ProgressRadial width="w-16" />
		<div class="text-center space-y-1">
			<p class="font-semibold">Entrée en cours de création…</p>
			<p class="text-sm opacity-70">Vous allez être redirigé dans quelques instants.</p>
		</div>
	</div>
{/if}
	<div class="rounded-lg p-4 variant-ghost-secondary w-full" class:hidden={isRedirecting}>
		<form {...createEntry.for(uid)} onsubmit={() => { submitted = true; }} class="space-y-4 w-full">
			<h3 class="h3">Valider ou annuler la création de l'entrée</h3>
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
						bind:value={effectorUid}
					/>
					<div class="badge variant-ghost-surface">{effector?.name_fr}</div>
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
					<div class="badge variant-ghost-surface">{effectorType?.label}</div>
				</label>
				<label class="label w-full">
					<span class="text-sm font-medium">Établissement</span>
					<input
						oninput={() => {}}
						class="input hidden"
						name="facility"
						type="text"
						placeholder=""
						bind:value={facilityUid}
					/>
				</label>
				{#if facilityUid}
					<DisplayFacility facilityUid={facilityUid} showEffectors={false} mapHeight={36} update={false} />
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
						{#if memberships?.length}
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
			<div class="flex gap-4 justify-end">
				<button
					type="submit"
					class="variant-filled-secondary btn"
					disabled={!!createEntry.for(uid).pending}>Valider</button
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

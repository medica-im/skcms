<script lang="ts">
	import { userRoles } from '$lib/auth/roles';
	import { createEntry } from '../../entry.remote.ts';
	import Fa from 'svelte-fa';
	import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
	import { faUser } from '@fortawesome/free-regular-svg-icons';
	import { navigating, page } from '$app/state';
	import * as m from '$msgs';
	import DisplayFacility from '$lib/Web/DisplayFacility.svelte';
	import type { Effector } from '$lib/interfaces/v2/effector.ts';
	import type { SelectType } from '$lib/interfaces/select.ts';
	import { ProgressRadial } from '@skeletonlabs/skeleton';
	import { allAccessOptions, accessDescriptions } from '$lib/Web/Entry/access';

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

	const r = $derived(userRoles(page.data?.user?.role));
	const isSuperUser = $derived(page.data?.user?.role == 'superuser');
	let effectorUid: string | undefined = $derived(effector?.uid);
	let effector_type: string | undefined = $derived(effectorType?.value);
	let facilityUid: string | undefined = $derived(facility?.value);
	let directory: string | undefined = $state();
	let isOwner = $state(true);
	let access = $state('anonymous');

	const accessOptions = $derived.by(() => {
		const role = page.data?.user?.role;
		if (role === 'superuser') return allAccessOptions;
		if (role === 'administrator') return allAccessOptions.filter(o => o.value !== 'superuser');
		return allAccessOptions.filter(o => o.value === 'anonymous' || o.value === 'staff');
	});
	const accessDescription = $derived(accessDescriptions[access] ?? '');

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
	const allIssues = $derived(createEntry.for(uid)?.fields?.allIssues() ?? []);
	const hasErrors = $derived(allIssues.length > 0);
	const isRedirecting = $derived(!!createEntry.for(uid)?.pending || !!navigating.to);

	const clear = () => {
		formResult = undefined;
		effector = undefined;
		facility = undefined;
		effectorType = undefined;
		directory = undefined;
		memberships = [];
		membershipsDone = !displayMembershipStep;
		access = 'anonymous';
	};
</script>
<!--
formResult: {JSON.stringify(formResult)}<br>
pending: {createEntry.for(uid)?.pending}<br>
submitted: {submitted}<br>
allIssues: {JSON.stringify(createEntry.for(uid).fields.allIssues())}<br>
hasErrors: {hasErrors}-->
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
			{#each createEntry.for(uid).fields.allIssues() ?? [] as issue}
				<aside class="alert variant-filled-error">
					<span class="badge-icon"><Fa size="2x" icon={faExclamationTriangle} /></span>
					<div class="alert-message">
						<h3 class="h3">Erreur</h3>
						<p>{issue.message === 'One active Entry object with same effector, effector_type and facility already exists.'
							? 'Une entrée active avec la même personne, la même catégorie et le même établissement existe déjà.'
							: issue.message}</p>
					</div>
				</aside>
			{/each}
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
				<div class="w-full">
					<span class="text-sm font-medium">{m['ACCESS.ACCESS_CONTROL']()}</span>
					<div class="flex flex-col lg:flex-row lg:items-center gap-2 mt-1">
						<label class="label">
							<select class="select" name="access" bind:value={access}>
								{#each accessOptions as option}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
						</label>
						<span class="text-sm opacity-70">{accessDescription}</span>
					</div>
				</div>
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
				{#if r.SuperUser || r.Admin}
					<input type="hidden" name="b:isOwner" value={isOwner ? 'on' : ''} />
					<label class="flex items-center gap-2">
						<input type="checkbox" bind:checked={isOwner} /> {m.ENTRY_IS_OWNER()}
					</label>
					<label class="label w-full">
						<span class="text-sm font-medium">{m.REDEEM_EMAIL()}</span>
						<input
							oninput={() => {}}
							class="input w-full"
							name="redeemEmail"
							type="email"
							placeholder=""
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

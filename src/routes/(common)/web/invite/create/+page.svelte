<script lang="ts">
	import { page } from '$app/state';
	import { createInvitee } from '$src/invitee.remote.ts';
	import { goto } from '$app/navigation';
	import * as m from '$msgs';
	import Fa from 'svelte-fa';
	import { faCheck, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
	import Select from 'svelte-select';
	import NoOptions from '$lib/Web/NoOptions.svelte';
	import type { Role } from '$lib/interfaces/v2/invitee';
	import type { PageData } from './$types';

	let { data, onclose }: { data: PageData; onclose?: () => void } = $props();

	const formKey = crypto.randomUUID();
	let result = $derived(createInvitee.for(formKey)?.result);

	let organization = $derived(data.organization);
	let session = $derived(data.session);

	const roleOptions = [
		{ value: 'staff', label: m['ROLE.STAFF']() },
		{ value: 'administrator', label: m['ROLE.ADMINISTRATOR']() }
	];
	const superUserRole = { value: 'superuser', label: m['ROLE.SUPERUSER']() };
	const isSuperUser = $derived(page.data?.user?.role == 'superuser');
	const getRoleOptions = $derived(() => {
		if (isSuperUser) {
			return [...roleOptions, superUserRole];
		}
		return roleOptions;
	});
	let email = $state('');
	let name = $state('');
	let selectedRole: { value: Role; label: string } | undefined = $state();
	let entry = $derived(organization.uid);
	let createdBy = $derived(session?.user?.providerAccountId || '');

	const disabled = $derived(!email || !selectedRole || Boolean(createInvitee.for(formKey).pending));


</script>

<div class="grid grid-cols-1 rounded-lg h-full w-full p-4 items-center gap-4">
	<div class="place-items-center">
		<h3 class="h3">Créer une invitation</h3>
		<p>Invitez un nouvel utilisateur à rejoindre votre organisation.</p>
	</div>

	<form
		{...createInvitee.for(formKey)}
		class="grid grid-cols-1 gap-4 w-full max-w-xl"
	>
		<!-- Hidden fields -->
		<input type="hidden" name="entry" value={entry} />
		<input type="hidden" name="createdBy" value={createdBy} />

		<!-- Email field -->
		<label class="label">
			<span>Email *</span>
			<input
				{...createInvitee.for(formKey).fields.email.as('email')}
				bind:value={email}
				class="input"
				placeholder="utilisateur@example.com"
				required
			/>
			{#each createInvitee.for(formKey).fields.email.issues() as iss}
				<p class="text-error-500 text-sm">{iss.message}</p>
			{/each}
		</label>

		<!-- Name field -->
		<label class="label">
			<span>Nom (optionnel)</span>
			<input {...createInvitee.for(formKey).fields.name.as('text')} bind:value={name} class="input" placeholder="Nom complet" />
		</label>

		<!-- Role select -->
		<div class="grid grid-cols-1 gap-2">
			<label class="label">
				<span>Rôle *</span>
				<input type="hidden" name="role" value={selectedRole?.value || ''} />
			</label>
			<Select
				items={getRoleOptions()}
				bind:value={selectedRole}
				placeholder="Sélectionner un rôle"
				hasError={!selectedRole}
			><NoOptions slot="empty" /></Select>
		</div>
		<!-- Submit button -->
		 <div class="flex flex-wrap gap-8 justify-end">
				<div class="flex gap-2 items-center">
					{#if result?.success && !email}
						<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
					{:else if result?.success==false}
						<span class="badge-icon variant-filled-error"><Fa icon={faExclamationCircle} /></span>
						<span class="text-base">{result?.response?.detail || result?.text}</span>
					{/if}
					{#each createInvitee.for(formKey).fields.allIssues() as iss}
						<span class="badge-icon variant-filled-error"><Fa icon={faExclamationCircle} /></span>
						<span class="text-base">{iss.message}</span>
					{/each}
				</div>
				<div class="w-auto justify-center">
					<button type="submit" class="btn variant-filled-primary w-min" {disabled}>
			{createInvitee.for(formKey).pending ? 'Envoi...' : 'Créer l\'invitation'}
		</button>
				</div>
				<div class="w-auto justify-center">
					<button
						type="button"
						class="variant-filled-error btn w-min"
						onclick={() => {
							if (onclose) onclose();
							else goto('/web/invite/invitees');
						}}
						>{#if result?.success}Fermer{:else}Annuler{/if}</button
					>
				</div>
			</div>
		
	</form>
</div>

<script lang="ts">
	import { createInvitee } from '$src/invitee.remote.ts';
	import { goto } from '$app/navigation';
	import * as m from '$msgs';
	import Fa from 'svelte-fa';
	import { faCheck, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
	import Select from 'svelte-select';
	import type { Role } from '$lib/interfaces/v2/invitee';
	import type { PageData } from './$types';

	interface Props {
		data: {
			session: PageData['session'];
			organization: PageData['organization'];
		};
		counter: number;
	}

	let { data, counter }: Props = $props();
	let result = $derived(createInvitee.for(counter)?.result);

	let organization = $derived(data.organization);
	let session = $derived(data.session);

	const roleOptions = [
		{ value: 'staff', label: m['ROLE.STAFF']() },
		{ value: 'administrator', label: m['ROLE.ADMINISTRATOR']() }
	];

	let email = $state('');
	let name = $state('');
	let selectedRole: { value: Role; label: string } | undefined = $state();
	let entry = $derived(organization.uid);
	let createdBy = $derived(session?.user?.providerAccountId || '');

	const disabled = $derived(!email || !selectedRole || Boolean(createInvitee.for(counter).pending) || result?.success);

</script>

<div class="grid grid-cols-1 rounded-lg h-full w-full p-4 items-center gap-4">
	<div class="place-items-center">
		<h3 class="h3">Créer une invitation</h3>
		<p>Invitez un nouvel utilisateur à rejoindre votre organisation.</p>
	</div>

	<form
		{...createInvitee.for(counter)}
		class="grid grid-cols-1 gap-4 w-full max-w-xl"
	>
		<!-- Hidden fields -->
		<input type="hidden" name="entry" value={entry} />
		<input type="hidden" name="createdBy" value={createdBy} />

		<!-- Email field -->
		<label class="label">
			<span>Email *</span>
			<input
				type="email"
				name="email"
				bind:value={email}
				class="input"
				placeholder="utilisateur@example.com"
				required
			/>
		</label>

		<!-- Name field -->
		<label class="label">
			<span>Nom (optionnel)</span>
			<input type="text" name="name" bind:value={name} class="input" placeholder="Nom complet" />
		</label>

		<!-- Role select -->
		<div class="grid grid-cols-1 gap-2">
			<label class="label">
				<span>Rôle *</span>
			</label>
			<Select
				items={roleOptions}
				bind:value={selectedRole}
				placeholder="Sélectionner un rôle"
				hasError={!selectedRole}
			/>
			<input type="hidden" name="role" value={selectedRole?.value || ''} />
		</div>
		<!-- Submit button -->
		 <div class="flex gap-8">
				<div class="flex gap-2 items-center">
					{#if result?.success==true}
						<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
					{:else if result?.success==false}
						<span class="badge-icon variant-filled-error"><Fa icon={faExclamationCircle} /></span>
						<span class="text-base">{result?.response?.detail || result?.text}</span>
					{/if}
				</div>
				<div class="w-auto justify-center">
					<button type="submit" class="btn variant-filled-primary w-min" {disabled}>
			{createInvitee.for(counter).pending ? 'Envoi...' : 'Créer l\'invitation'}
		</button>
				</div>
				<div class="w-auto justify-center">
					<button
						type="button"
						class="variant-filled-error btn w-min"
						onclick={() => {
							goto('/web/invite/invitees');
						}}
						>{#if result?.success}Fermer{:else}Annuler{/if}</button
					>
				</div>
			</div>
		
	</form>
</div>

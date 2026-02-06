<script lang="ts">
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import * as m from '$msgs';
	import Select from 'svelte-select';
	import type { Role } from '$lib/interfaces/v2/invitee';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const roleOptions = [
		{ value: 'registered', label: m['ROLE.REGISTERED']() },
		{ value: 'staff', label: m['ROLE.STAFF']() },
		{ value: 'administrator', label: m['ROLE.ADMINISTRATOR']() }
	];

	let email = $state('');
	let name = $state('');
	let selectedRole: { value: Role; label: string } | undefined = $state();
	let isSubmitting = $state(false);
	let error = $state('');

	const disabled = $derived(!email || !selectedRole || isSubmitting);

	function handleSubmit() {
		isSubmitting = true;
		error = '';
	}
</script>

<div class="grid grid-cols-1 rounded-lg h-full w-full p-4 items-center gap-4">
	<div class="place-items-center">
		<h3 class="h3">Créer une invitation</h3>
		<p>Invitez un nouvel utilisateur à rejoindre votre organisation.</p>
	</div>

	<form
		method="POST"
		action="?/createInvitee"
		use:enhance={({ formData }) => {
			handleSubmit();
			formData.append('entry', data.organization.neomodel_uid || '');
			formData.append('createdBy', data.user?.uid || '');
			return async ({ result, update }) => {
				isSubmitting = false;
				if (result.type === 'success') {
					// Close modal or redirect
					history.back();
				} else if (result.type === 'failure') {
					error = result.data?.message || 'Une erreur est survenue';
				}
				await update();
			};
		}}
		class="grid grid-cols-1 gap-4 w-full max-w-xl"
	>
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

		{#if error}
			<div class="alert variant-filled-error">
				<p>{error}</p>
			</div>
		{/if}

		<!-- Submit button -->
		<button type="submit" class="btn variant-filled-primary w-min" {disabled}>
			{isSubmitting ? 'Envoi...' : 'Créer l\'invitation'}
		</button>
	</form>
</div>

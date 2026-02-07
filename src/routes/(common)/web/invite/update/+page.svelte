<script lang="ts">
	import { updateInvitee } from '$src/invitee.remote.ts';
	import { goto } from '$app/navigation';
	import * as m from '$msgs';
	import Fa from 'svelte-fa';
	import { faCheck, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
	import Select from 'svelte-select';
	import type { Role, Invitee } from '$lib/interfaces/v2/invitee';
	import type { PageData } from './$types';
	import type { SelectType } from '$src/lib/interfaces/select';

	interface Props {
		data: {
			session: PageData['session'];
			invitee: Invitee;
		};
	}

	let { data }: Props = $props();
	let result = $derived(updateInvitee.for(data.invitee.uid)?.result);
	let invitee = $derived(data.invitee);

	const roleOptions = [
		{ value: 'staff', label: m['ROLE.STAFF']() },
		{ value: 'administrator', label: m['ROLE.ADMINISTRATOR']() }
	] as SelectType[];

	let email = $state(data.invitee?.email || '');
	let name = $state(data.invitee?.name || '');
	let active = $state(data.invitee?.active ?? true);
	let selectedRole: SelectType | undefined = $state(
		roleOptions.find((r) => r.value === data.invitee?.role)
	);

	const disabled = $derived(!email || !selectedRole || Boolean(updateInvitee.for(data.invitee.uid).pending) || result?.success);
</script>

<div class="grid grid-cols-1 rounded-lg h-full w-full p-4 items-center gap-4">
	<div class="place-items-center">
		<h3 class="h3">Modifier l'invitation</h3>
		<p>Modifiez les informations de l'utilisateur invité.</p>
	</div>

	<form
		{...updateInvitee.for(data.invitee.uid)}
		class="grid grid-cols-1 gap-4 w-full max-w-xl"
	>
		<!-- Hidden field for invitee id -->
		<input type="hidden" name="id" value={invitee?.uid} />

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

		<!-- Active toggle -->
		<label class="flex items-center gap-3">
			<input type="hidden" name="active" value={String(active)} />
			<input class="checkbox" type="checkbox" bind:checked={active} />
			<span>Actif</span>
		</label>

		<!-- Submit button -->
		<div class="flex gap-8">
			<div class="flex gap-2 items-center">
				{#if result?.success == true}
					<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
				{:else if result?.success == false}
					<span class="badge-icon variant-filled-error"><Fa icon={faExclamationCircle} /></span>
					<span class="text-base">{result?.text}</span>
					<span class="text-base">{result?.data?.message}</span>
				{/if}
			</div>
			<div class="w-auto justify-center">
				<button type="submit" class="btn variant-filled-primary w-min" {disabled}>
					{updateInvitee.for(data.invitee.uid).pending ? 'Envoi...' : 'Mettre à jour'}
				</button>
			</div>
			<div class="w-auto justify-center">
				<button
					type="button"
					class="variant-filled-error btn w-min"
					onclick={() => {
						goto('/web/invite/invitees');
					}}
				>
					{#if result?.success}Fermer{:else}Annuler{/if}
				</button>
			</div>
		</div>
	</form>
</div>

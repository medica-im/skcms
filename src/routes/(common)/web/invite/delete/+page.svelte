<script lang="ts">
	import { deleteInvitee } from '$src/invitee.remote.ts';
	import { goto } from '$app/navigation';
	import Fa from 'svelte-fa';
	import { faCheck, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
	import type { Invitee } from '$lib/interfaces/v2/invitee';
	import type { PageData } from './$types';

	interface Props {
		data: {
			session: PageData['session'];
			invitee: Invitee;
		};
		redirect?: boolean;
	}

	let { data, redirect=true }: Props = $props();
	let result = $derived(deleteInvitee.for(data.invitee.uid)?.result);
	let invitee = $derived(data.invitee);

	const disabled = $derived(Boolean(deleteInvitee.for(data.invitee.uid).pending) || result?.success);
</script>

<div class="grid grid-cols-1 rounded-lg h-full w-full p-4 items-center gap-4">
	<div class="place-items-center">
		<h3 class="h3">Supprimer l'invitation</h3>
		<p>Êtes-vous sûr de vouloir supprimer l'invitation pour <strong>{invitee.email}</strong> ?</p>
		<p class="text-sm text-surface-500 mt-2">Cette action est irréversible.</p>
	</div>

	<form
		{...deleteInvitee.for(data.invitee.uid)}
		class="grid grid-cols-1 gap-4 w-full max-w-xl"
	>
		<input type="hidden" name="id" value={invitee?.uid} />
		<input type="hidden" name="redirect" value={redirect ? 'true' : ''} />

		<!-- Submit button -->
		<div class="flex gap-8">
			<div class="flex gap-2 items-center">
				{#if result?.success == true}
					<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
				{:else if result?.success == false}
					<span class="badge-icon variant-filled-error"><Fa icon={faExclamationCircle} /></span>
					<span class="text-base">{result?.text}</span>
				{/if}
			</div>
			<div class="w-auto justify-center">
				<button type="submit" class="btn variant-filled-error w-min" {disabled}>
					{deleteInvitee.for(data.invitee.uid).pending ? 'Suppression...' : 'Supprimer'}
				</button>
			</div>
			<div class="w-auto justify-center">
				<button
					type="button"
					class="variant-filled-surface btn w-min"
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

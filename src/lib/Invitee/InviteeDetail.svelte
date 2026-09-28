<script lang="ts">
	import type { Invitee } from '$lib/interfaces/v2/invitee';
	import type { User } from '$lib/interfaces/v2/user';
	import * as m from '$msgs';
	import Fa from 'svelte-fa';
	import { faEnvelope, faUser, faPenToSquare, faTrash, faUserPlus, faClock, faShieldHalved, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
	import InviteeStatus from './InviteeStatus.svelte';
	import InviteeEmailDelivery from './InviteeEmailDelivery.svelte';
	import InviteeResend from './InviteeResend.svelte';
	import { Accordion, AccordionItem } from '@skeletonlabs/skeleton';
	import FileJson from '@lucide/svelte/icons/file-json';
	import RoleBadge from '$lib/RoleBadge.svelte';
	import { base } from '$app/paths';

	let { invitee, createdByUser, onEdit, onDelete }: { invitee: Invitee; createdByUser?: User; onEdit?: (invitee: Invitee) => void; onDelete?: (invitee: Invitee) => void } = $props();

	let isRedeemed = $derived(invitee.redeemedAt != null);

	function formatFullDateTime(dateString: string | number | null): string {
		if (!dateString) return '—';
		const date = new Date(dateString);
		const datePart = date.toLocaleDateString('fr-FR', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
		const timePart = date.toLocaleTimeString('fr-FR', {
			hour: '2-digit',
			minute: '2-digit'
		});
		return `${datePart}, ${timePart}`;
	}
</script>

<div class="card variant-ghost p-4 {!isRedeemed && invitee.active ? 'shadow-[inset_4px_0_0_rgb(var(--color-success-500))]' : ''}">
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		<!-- Email -->
		<div>
			<span class="text-sm text-surface-500 flex items-center gap-1">
				<Fa icon={faEnvelope} size="sm" />
				Email
			</span>
			<p class="font-semibold">{invitee.email}</p>
		</div>

		<!-- Name -->
		<div>
			<span class="text-sm text-surface-500 flex items-center gap-1">
				<Fa icon={faUser} size="sm" />
				Nom
			</span>
			<p class="font-semibold">{invitee.name || '—'}</p>
		</div>

		<!-- Role -->
		<div>
			<span class="text-sm text-surface-500 flex items-center gap-1">
				<Fa icon={faShieldHalved} size="sm" />
				Rôle
			</span>
			<p class="mt-1">
				<RoleBadge role={invitee.role} full />
			</p>
		</div>

		<!-- Status, in every state: the same badge as the list (InviteeStatus) -->
		<div>
			<span class="text-sm text-surface-500">{m.INVITEE_COL_STATUS()}</span>
			<p><InviteeStatus active={invitee.active} redeemedAt={invitee.redeemedAt} /></p>
		</div>

		<!-- Whether the invitation's email went out, with a failure's reason -->
		<div>
			<span class="text-sm text-surface-500 flex items-center gap-1">
				<Fa icon={faEnvelope} size="sm" />
				{m.INVITEE_EMAIL_DELIVERY()}
			</span>
			<p class="mt-1"><InviteeEmailDelivery delivery={invitee.emailDelivery} variant="detail" /></p>
			{#if !isRedeemed && invitee.active}
				<div class="mt-2"><InviteeResend uid={invitee.uid} /></div>
			{/if}
		</div>

		<!-- Created at -->
		<div>
			<span class="text-sm text-surface-500 flex items-center gap-1">
				<Fa icon={faClock} size="sm" />
				Créé le
			</span>
			<p class="font-semibold">{formatFullDateTime(invitee.createdAt)}</p>
		</div>

		<!-- Created by -->
		<div>
			<span class="text-sm text-surface-500 flex items-center gap-1">
				<Fa icon={faUserPlus} size="sm" />
				Créé par
			</span>
			<p class="font-semibold">
				<a href="{base}/web/users/{invitee.createdBy}" class="anchor">{createdByUser?.name || createdByUser?.email || invitee.createdBy}</a>
			</p>
		</div>

		<!-- Redeemed at -->
		<div>
			<span class="text-sm text-surface-500 flex items-center gap-1">
				<Fa icon={faCheckCircle} size="sm" />
				Utilisé le
			</span>
			<p class="font-semibold">{isRedeemed ? formatFullDateTime(invitee.redeemedAt) : '—'}</p>
		</div>
	</div>

	<!-- Actions -->
	{#if !isRedeemed}
		<div class="flex gap-2 mt-4 pt-4 border-t border-surface-500/20">
			<button onclick={() => onEdit?.(invitee)} class="btn btn-sm variant-ghost-secondary">
				<Fa icon={faPenToSquare} />
				<span>Modifier</span>
			</button>
			<button onclick={() => onDelete?.(invitee)} class="btn btn-sm variant-ghost-error">
				<Fa icon={faTrash} />
				<span>Supprimer</span>
			</button>
		</div>
	{/if}
</div>

{#if import.meta.env.DEV}
	<div class="card variant-ringed mt-4">
		<Accordion>
			<AccordionItem>
				<svelte:fragment slot="lead"><FileJson /></svelte:fragment>
				<svelte:fragment slot="summary">Données JSON</svelte:fragment>
				<svelte:fragment slot="content"><pre class="pre text-sm overflow-x-auto">{JSON.stringify(invitee, null, 2)}</pre></svelte:fragment>
			</AccordionItem>
		</Accordion>
	</div>
{/if}

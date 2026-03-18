<script lang="ts">
	import type { Invitee, Role } from '$lib/interfaces/v2/invitee';
	import type { User } from '$lib/interfaces/v2/user';
	import * as m from '$msgs';
	import Fa from 'svelte-fa';
	import { faEnvelope, faUser, faCircle, faPenToSquare, faTrash, faUserPlus, faClock, faShieldHalved, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
	import { Accordion, AccordionItem } from '@skeletonlabs/skeleton';
	import FileJson from '@lucide/svelte/icons/file-json';

	let { invitee, createdByUser, onEdit, onDelete }: { invitee: Invitee; createdByUser?: User; onEdit?: (invitee: Invitee) => void; onDelete?: (invitee: Invitee) => void } = $props();

	let isRedeemed = $derived(invitee.redeemedAt != null);

	const roleLabels: Record<Role, string> = {
		superuser: m['ROLE.SUPERUSER_SHORT'](),
		administrator: m['ROLE.ADMINISTRATOR_SHORT'](),
		staff: m['ROLE.STAFF_SHORT'](),
		registered: m['ROLE.REGISTERED_SHORT'](),
		anonymous: m['ROLE.ANONYMOUS_SHORT']()
	};

	const roleVariants: Record<Role, string> = {
		superuser: 'variant-filled-error',
		administrator: 'variant-filled-warning',
		staff: 'variant-filled-primary',
		registered: 'variant-filled-secondary',
		anonymous: 'variant-ghost-surface'
	};

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

<div class="card variant-ghost p-4 {isRedeemed ? 'opacity-50' : ''}">
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
				<span class="badge {roleVariants[invitee.role]} badge-sm">
					{roleLabels[invitee.role]}
				</span>
			</p>
		</div>

		<!-- Status -->
		<div>
			<span class="text-sm text-surface-500 flex items-center gap-1">
				<Fa icon={faCircle} size="sm" />
				Statut
			</span>
			<p class="font-semibold flex items-center gap-1">
				<Fa
					icon={faCircle}
					size="sm"
					class={invitee.active ? 'text-success-500' : 'text-surface-400'}
				/>
				{invitee.active ? 'Active' : 'Inactive'}
			</p>
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
				<a href="/web/users/{invitee.createdBy}" class="anchor">{createdByUser?.name || createdByUser?.email || invitee.createdBy}</a>
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

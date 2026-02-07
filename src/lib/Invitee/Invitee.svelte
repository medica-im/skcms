<script lang="ts">
	import { page } from '$app/state';
	import type { Invitee, Role } from '$lib/interfaces/v2/invitee';
	import * as m from '$msgs';
	import Fa from 'svelte-fa';
	import { faEnvelope, faUser, faUserShield, faCircle, faEye, faPenToSquare, faTrash } from '@fortawesome/free-solid-svg-icons';

	let { invitee, showLink = true, onEdit, onDelete }: { invitee: Invitee; showLink?: boolean; onEdit?: (invitee: Invitee) => void; onDelete?: (invitee: Invitee) => void } = $props();

	let showDetailLink = $derived(showLink && (import.meta.env.DEV || page.data?.user?.role === 'superuser'));

	const roleLabels: Record<Role, string> = {
		superuser: m['ROLE.SUPERUSER'](),
		administrator: m['ROLE.ADMINISTRATOR'](),
		staff: m['ROLE.STAFF'](),
		registered: m['ROLE.REGISTERED'](),
		anonymous: m['ROLE.ANONYMOUS']()
	};

	const roleVariants: Record<Role, string> = {
		superuser: 'variant-filled-error',
		administrator: 'variant-filled-warning',
		staff: 'variant-filled-primary',
		registered: 'variant-filled-secondary',
		anonymous: 'variant-ghost-surface'
	};

	function formatDate(dateString: string | null): string {
		if (!dateString) return '';
		const date = new Date(dateString);
		return date.toLocaleDateString('fr-FR', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<div class="card variant-ghost p-3 flex flex-col gap-3 lg:grid lg:grid-cols-[auto_280px_1fr_auto_auto_auto_auto_auto_auto] lg:items-center lg:gap-4 hover:variant-soft transition-colors">
	<!-- Avatar/Icon -->
	<div class="flex items-center gap-3 lg:contents">
		<div class="w-10 h-10 rounded-full bg-surface-500/10 flex items-center justify-center flex-shrink-0">
			<Fa icon={faUser} class="text-surface-600" />
		</div>

		<!-- Name -->
		<span class="font-semibold truncate">{invitee.name || '—'}</span>
	</div>

	<!-- Email -->
	<div class="flex items-center gap-2 text-surface-600 min-w-0">
		<span class="w-4 flex-shrink-0"><Fa icon={faEnvelope} size="sm" /></span>
		<span class="truncate">{invitee.email}</span>
	</div>

	<!-- Role Badge -->
	<span class="badge {roleVariants[invitee.role]} badge-sm w-fit">
		<Fa icon={faUserShield} size="xs" />
		<span class="ml-1">{roleLabels[invitee.role]}</span>
	</span>

	<!-- Date -->
	<span class="text-sm text-surface-500">
		{invitee.createdAt ? formatDate(invitee.createdAt) : '—'}
	</span>

	<!-- Status Indicator -->
	<div class="flex items-center gap-1">
		<Fa
			icon={faCircle}
			size="sm"
			class={invitee.active ? 'text-success-500' : 'text-surface-400'}
		/>
		<span class="text-sm text-surface-600">
			{invitee.active ? 'Active' : 'Inactive'}
		</span>
	</div>

	<!-- Edit Button -->
	<button onclick={() => onEdit?.(invitee)} class="btn-icon btn-icon-sm variant-ghost-secondary">
		<Fa icon={faPenToSquare} />
	</button>

	<!-- Delete Button -->
	<button onclick={() => onDelete?.(invitee)} class="btn-icon btn-icon-sm variant-ghost-error">
		<Fa icon={faTrash} />
	</button>

	<!-- Detail Link -->
	{#if showDetailLink}
		<a href="/web/invite/invitees/{invitee.uid}" class="btn-icon btn-icon-sm variant-ghost-primary">
			<Fa icon={faEye} />
		</a>
	{/if}
</div>

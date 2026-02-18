<script lang="ts">
	import { page } from '$app/state';
	import type { Invitee, Role } from '$lib/interfaces/v2/invitee';
	import * as m from '$msgs';
	import Fa from 'svelte-fa';
	import { faEnvelope, faUser, faCircle, faEye, faPenToSquare, faTrash } from '@fortawesome/free-solid-svg-icons';

	let { invitee, showLink = true, onEdit, onDelete }: { invitee: Invitee; showLink?: boolean; onEdit?: (invitee: Invitee) => void; onDelete?: (invitee: Invitee) => void } = $props();

	let isRedeemed = $derived(invitee.redeemedAt != null);
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
		const day = String(date.getDate()).padStart(2, '0');
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const year = date.getFullYear();
		return `${day}/${month}/${year}`;
	}

	function formatDateTime(timestamp: number): string {
		const date = new Date(timestamp);
		const day = String(date.getDate()).padStart(2, '0');
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const year = date.getFullYear();
		const time = date.toLocaleTimeString('fr-FR', {
			hour: '2-digit',
			minute: '2-digit'
		});
		return `${day}/${month}/${year} ${time}`;
	}
</script>

<div class="card variant-ghost p-3 flex flex-col gap-3 lg:grid lg:grid-cols-[40px_1fr_1.5fr_120px_130px_130px_80px_36px_36px_36px] lg:items-center lg:gap-4 hover:variant-soft transition-colors {isRedeemed ? 'opacity-50' : ''}">
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
		{roleLabels[invitee.role]}
	</span>

	<!-- Date -->
	<span class="text-sm text-surface-500">
		{invitee.createdAt ? formatDate(invitee.createdAt) : '—'}
	</span>

	<!-- Redeemed Date -->
	<span class="text-sm text-surface-500">
		{#if isRedeemed}
			<span class="lg:hidden">{m.INVITEE_REDEEMED_ON()}&nbsp;</span>{formatDateTime(invitee.redeemedAt!)}
		{/if}
	</span>

	<!-- Status Indicator -->
	{#if !isRedeemed}
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
	{:else}
		<span></span>
	{/if}

	<!-- Actions -->
	<div class="flex items-center gap-1 lg:contents">
		{#if !isRedeemed}
			<button onclick={() => onEdit?.(invitee)} class="btn-icon btn-icon-sm variant-ghost-secondary">
				<Fa icon={faPenToSquare} />
			</button>
		{:else}
			<span class="hidden lg:inline"></span>
		{/if}

		{#if !isRedeemed}
			<button onclick={() => onDelete?.(invitee)} class="btn-icon btn-icon-sm variant-ghost-error">
				<Fa icon={faTrash} />
			</button>
		{:else}
			<span class="hidden lg:inline"></span>
		{/if}

		{#if showDetailLink}
			<a href="/web/invite/invitees/{invitee.uid}" class="btn-icon btn-icon-sm variant-ghost-primary">
				<Fa icon={faEye} />
			</a>
		{/if}
	</div>
</div>

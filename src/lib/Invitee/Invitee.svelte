<script lang="ts">
	import { page } from '$app/state';
	import type { Invitee } from '$lib/interfaces/v2/invitee';
	import * as m from '$msgs';
	import Fa from 'svelte-fa';
	import { faEnvelope, faUser, faEye, faPenToSquare, faTrash, faCheck, faXmark } from '@fortawesome/free-solid-svg-icons';
	import InviteeStatus from './InviteeStatus.svelte';
	import { onMount } from 'svelte';
	import RoleBadge from '$lib/RoleBadge.svelte';
	import ListDateTime from '$lib/components/DateTime/ListDateTime.svelte';
	import { base } from '$app/paths';

	let { invitee, showLink = true, highlighted = false, onEdit, onDelete }: { invitee: Invitee; showLink?: boolean; highlighted?: boolean; onEdit?: (invitee: Invitee) => void; onDelete?: (invitee: Invitee) => void } = $props();

	let el: HTMLDivElement;
	let isRedeemed = $derived(invitee.redeemedAt != null);

	onMount(() => {
		if (highlighted) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
	});

	let showDetailLink = $derived(showLink && (import.meta.env.DEV || page.data?.user?.role === 'superuser'));

</script>

<div bind:this={el} class="card variant-ghost p-3 flex flex-col gap-3 lg:grid lg:grid-cols-[40px_1fr_1.5fr_120px_130px_130px_120px_36px_36px_36px] lg:items-center lg:gap-4 hover:variant-soft transition-colors {!isRedeemed && invitee.active ? 'shadow-[inset_4px_0_0_rgb(var(--color-success-500))]' : ''} {highlighted ? 'invitee-highlighted' : ''}">
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
	<RoleBadge role={invitee.role} uniform />

	<!-- Date -->
	<span class="text-sm">
		<ListDateTime value={invitee.createdAt} />
	</span>

	<!-- Redeemed Date -->
	<span class="text-sm flex items-center gap-1">
		{#if isRedeemed}
			<Fa icon={faCheck} size="sm" class="text-success-500" />
			<span class="lg:hidden">{m.INVITEE_REDEEMED_ON()}&nbsp;</span><ListDateTime value={invitee.redeemedAt} />
		{:else}
			<Fa icon={faXmark} size="sm" class="text-surface-400" />
		{/if}
	</span>

	<!-- Status: shape, icon and word, never colour alone (InviteeStatus) -->
	<InviteeStatus active={invitee.active} redeemedAt={invitee.redeemedAt} />

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
			<a href="{base}/web/invite/invitees/{invitee.uid}" class="btn-icon btn-icon-sm variant-ghost-primary">
				<Fa icon={faEye} />
			</a>
		{/if}
	</div>
</div>

<style>
	@keyframes highlight-ring {
		0%, 60% {
			box-shadow: 0 0 0 2px rgb(var(--color-primary-500) / 1), 0 0 0 5px rgb(var(--color-primary-500) / 0.15);
		}
		100% {
			box-shadow: 0 0 0 2px rgb(var(--color-primary-500) / 0), 0 0 0 5px rgb(var(--color-primary-500) / 0);
		}
	}

	.invitee-highlighted {
		animation: highlight-ring 5s ease-out forwards;
	}
</style>

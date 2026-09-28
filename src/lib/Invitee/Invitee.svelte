<script lang="ts">
	/**
	 * One invitation in the list, laid out twice:
	 *
	 * - below lg, a compact list item in the Material sense -- who (name, a
	 *   compact role chip), how to reach them (email), what state (status and
	 *   dates) -- with the actions in a column at the trailing edge and the
	 *   name leading to the detail. See Invitee.svelte.test.ts;
	 * - from lg, a row of the table under the page's column headers.
	 *
	 * The action buttons are snippets, so both layouts share them.
	 */
	import { page } from '$app/state';
	import type { Invitee } from '$lib/interfaces/v2/invitee';
	import * as m from '$msgs';
	import Fa from 'svelte-fa';
	import { faEnvelope, faUser, faEye, faPenToSquare, faTrash, faCheck, faXmark } from '@fortawesome/free-solid-svg-icons';
	import InviteeStatus from './InviteeStatus.svelte';
	import InviteeEmailDelivery from './InviteeEmailDelivery.svelte';
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
	const detailHref = $derived(`${base}/web/invite/invitees/${invitee.uid}`);

	// An active invitation carries a green bar on its leading edge; an inset
	// shadow, so it takes no room and the rows stay aligned.
	const cardClass = $derived(
		`card variant-ghost hover:variant-soft transition-colors ${!isRedeemed && invitee.active ? 'shadow-[inset_4px_0_0_rgb(var(--color-success-500))]' : ''} ${highlighted ? 'invitee-highlighted' : ''}`
	);
</script>

<!-- On the compact card the target is 44px but the ring drawn inside it is the
     small one (33px): a full-size ring read as heavy in the narrow column. The
     table row keeps its small buttons. Labelled: an icon alone says nothing to
     a screen reader. -->
{#snippet editButton(compact: boolean)}
	<button onclick={() => onEdit?.(invitee)} class={compact ? 'w-11 h-11 inline-flex items-center justify-center rounded-full' : 'btn-icon btn-icon-sm variant-ghost-secondary'} aria-label={m.EDIT()} title={m.EDIT()}>
		{#if compact}
			<span class="btn-icon btn-icon-sm variant-ghost-secondary" aria-hidden="true"><Fa icon={faPenToSquare} /></span>
		{:else}
			<Fa icon={faPenToSquare} />
		{/if}
	</button>
{/snippet}

{#snippet deleteButton(compact: boolean)}
	<button onclick={() => onDelete?.(invitee)} class={compact ? 'w-11 h-11 inline-flex items-center justify-center rounded-full' : 'btn-icon btn-icon-sm variant-ghost-error'} aria-label={m.DELETE()} title={m.DELETE()}>
		{#if compact}
			<span class="btn-icon btn-icon-sm variant-ghost-error" aria-hidden="true"><Fa icon={faTrash} /></span>
		{:else}
			<Fa icon={faTrash} />
		{/if}
	</button>
{/snippet}

<div bind:this={el}>
	<!-- Narrow screens: a compact list item. -->
	<div data-testid="invitee-card-compact" class="{cardClass} lg:hidden flex items-start gap-3 p-3">
		<div class="min-w-0 flex-1 space-y-1">
			<div class="flex items-center gap-2 min-w-0">
				{#if showDetailLink}
					<a href={detailHref} class="font-semibold truncate hover:underline">{invitee.name || '—'}</a>
				{:else}
					<span class="font-semibold truncate">{invitee.name || '—'}</span>
				{/if}
				<RoleBadge role={invitee.role} class="shrink-0" />
			</div>
			<div class="text-sm truncate">{invitee.email}</div>
			<!-- Only when the email needs attention (failed or pending):
			     the compact card has no "Envoi" column to say it. -->
			<InviteeEmailDelivery delivery={invitee.emailDelivery} />
			<!-- No "·" separator: when the line wraps it is left dangling at its end. -->
			<div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
				<span class="inline-flex items-center gap-2">
					<InviteeStatus active={invitee.active} redeemedAt={invitee.redeemedAt} />
					{#if isRedeemed}<ListDateTime value={invitee.redeemedAt} />{/if}
				</span>
				<span>{m.INVITEE_COL_CREATED()}&nbsp;: <ListDateTime value={invitee.createdAt} /></span>
			</div>
		</div>
		{#if !isRedeemed && (onEdit || onDelete)}
			<div class="flex flex-col gap-1 shrink-0">
				{#if onEdit}{@render editButton(true)}{/if}
				{#if onDelete}{@render deleteButton(true)}{/if}
			</div>
		{/if}
	</div>

	<!-- Large screens: a row under the page's column headers. -->
	<div class="{cardClass} hidden p-3 lg:grid lg:grid-cols-[40px_1fr_1.5fr_120px_130px_130px_120px_130px_36px_36px_36px] lg:items-center lg:gap-4">
		<div class="w-10 h-10 rounded-full bg-surface-500/10 flex items-center justify-center">
			<Fa icon={faUser} class="text-surface-600" />
		</div>
		<span class="font-semibold truncate">{invitee.name || '—'}</span>

		<div class="flex items-center gap-2 text-surface-600 min-w-0">
			<span class="w-4 flex-shrink-0"><Fa icon={faEnvelope} size="sm" /></span>
			<span class="truncate">{invitee.email}</span>
		</div>

		<RoleBadge role={invitee.role} uniform />

		<span class="text-sm"><ListDateTime value={invitee.createdAt} /></span>

		<span class="text-sm flex items-center gap-1">
			{#if isRedeemed}
				<Fa icon={faCheck} size="sm" class="text-success-500" />
				<ListDateTime value={invitee.redeemedAt} />
			{:else}
				<Fa icon={faXmark} size="sm" class="text-surface-400" />
			{/if}
		</span>

		<!-- Status: shape, icon and word, never colour alone (InviteeStatus) -->
		<InviteeStatus active={invitee.active} redeemedAt={invitee.redeemedAt} />

		<!-- Whether the email went out; a failure is a link to the details -->
		<InviteeEmailDelivery delivery={invitee.emailDelivery} variant="column" href={detailHref} />

		{#if !isRedeemed}{@render editButton(false)}{:else}<span></span>{/if}
		{#if !isRedeemed}{@render deleteButton(false)}{:else}<span></span>{/if}
		{#if showDetailLink}
			<a href={detailHref} class="btn-icon btn-icon-sm variant-ghost-primary" aria-label={m.INVITEE_VIEW()} title={m.INVITEE_VIEW()}>
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

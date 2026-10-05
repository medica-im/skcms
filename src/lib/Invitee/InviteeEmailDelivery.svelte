<script lang="ts">
	/**
	 * Whether an invitation's email went out (backend mailer.delivery).
	 *
	 * - flag (default): the compact card, which has no columns: only what needs
	 *   attention -- a failed or pending email. "Sent" there on every card
	 *   would bury the one that failed.
	 * - column: the list's "Envoi" column, every invitation, in a short word.
	 *   A failed email is a red cross linking to `href`, the invitation's page,
	 *   where the reason and the resend button are.
	 * - detail: the invitation's page, in full, with the time and a failure's
	 *   reason in words (errorKind), the service's own text below it; for an
	 *   email queued and never settled (timedOut), that it most likely never
	 *   left.
	 *
	 * Bounced, complained (spam) and suppressed (do-not-send list) need acting
	 * on like a failure; deferred is flagged like a pending one. Looks and
	 * words are shared with the batch report: ./emailDelivery.ts.
	 *
	 * A failure is the red circle-cross wherever it is shown. Like
	 * InviteeStatus, never colour alone: an icon and a word.
	 * See InviteeEmailDelivery.svelte.test.ts.
	 */
	import Fa from 'svelte-fa';
	import { faCircleXmark } from '@fortawesome/free-solid-svg-icons';
	import * as m from '$msgs';
	import ListDateTime from '$lib/components/DateTime/ListDateTime.svelte';
	import type { EmailDelivery } from '$lib/interfaces/v2/invitee';
	import { deliveryLook, errorKindWords, NEEDS_ACTION, SETTLED_OK, type DeliveryState } from './emailDelivery';

	let {
		delivery,
		variant = 'flag',
		href = undefined
	}: {
		delivery: EmailDelivery | null | undefined;
		variant?: 'flag' | 'column' | 'detail';
		/** column only: where a failed email leads. */
		href?: string;
	} = $props();

	const state: DeliveryState = $derived(delivery?.status ?? 'unknown');
	const shown = $derived(variant !== 'flag' || !SETTLED_OK.has(state));
	const failed = $derived(NEEDS_ACTION.has(state));
	const current = $derived(deliveryLook[state]);
	// Why it failed, in words: the kind when the service said, the timeout
	// when nothing did, the service's raw text as a last resort.
	const reason = $derived(
		delivery?.timedOut
			? m.INVITEE_EMAIL_TIMED_OUT()
			: delivery?.errorKind
				? errorKindWords[delivery.errorKind]()
				: (delivery?.error ?? null)
	);
</script>

{#if variant === 'column'}
	{#if failed && href}
		<a
			{href}
			data-testid="invitee-email-delivery-column"
			data-state={state}
			class="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-error-700-200-token hover:underline"
		>
			<span class="text-error-500" aria-hidden="true" data-testid="invitee-email-delivery-cross">
				<Fa icon={faCircleXmark} />
			</span>
			<span>{current.short()}</span>
			<span class="sr-only">— {m.INVITEE_EMAIL_SEE_DETAIL()}</span>
		</a>
	{:else}
		<span data-testid="invitee-email-delivery-column" data-state={state} class="inline-flex items-center gap-2 text-sm {current.tone}">
			{#if state === 'unknown'}
				<span aria-hidden="true">—</span>
				<span class="sr-only">{m.INVITEE_EMAIL_UNKNOWN()}</span>
			{:else}
				<span aria-hidden="true"><Fa icon={current.icon} /></span>
				<span>{current.short()}</span>
			{/if}
		</span>
	{/if}
{:else if shown}
	<span class="inline-flex flex-col gap-1">
		<span
			data-testid="invitee-email-delivery"
			data-state={state}
			class="inline-flex items-center gap-2 text-sm {current.tone}"
		>
			{#if failed}
				<span class="text-error-500" aria-hidden="true" data-testid="invitee-email-delivery-cross">
					<Fa icon={faCircleXmark} />
				</span>
			{:else}
				<span aria-hidden="true"><Fa icon={current.icon} /></span>
			{/if}
			<span>{current.words()}</span>
			{#if variant === 'detail' && delivery}
				<span class="font-normal text-surface-600-300-token" data-testid="invitee-email-delivery-at">
					<ListDateTime value={delivery.at} />
				</span>
			{/if}
		</span>
		{#if variant === 'detail'}
			{#if failed && reason}
				<span class="text-sm break-words text-surface-700-200-token" data-testid="invitee-email-delivery-error">
					{reason}
				</span>
				{#if delivery?.errorKind && delivery?.error}
					<span class="text-xs break-words text-surface-600-300-token" data-testid="invitee-email-delivery-raw">
						{delivery.error}
					</span>
				{/if}
			{:else if current.hint}
				<span class="text-sm text-surface-600-300-token">{current.hint()}</span>
			{/if}
		{/if}
	</span>
{/if}

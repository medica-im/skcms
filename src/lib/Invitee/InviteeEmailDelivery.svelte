<script lang="ts">
	/**
	 * Whether an invitation's email went out (backend mailer.delivery).
	 *
	 * In the list (default) only what needs attention: a failure, a send in
	 * progress, one never confirmed. "Sent" on every row would bury the one
	 * that failed. `detailed` (the detail page) always answers, with the time
	 * and the reason of a failure.
	 *
	 * Like InviteeStatus, never colour alone: an icon and a word.
	 * See InviteeEmailDelivery.svelte.test.ts.
	 */
	import Fa from 'svelte-fa';
	import {
		faPaperPlane,
		faTriangleExclamation,
		faHourglassHalf,
		faCircleQuestion
	} from '@fortawesome/free-solid-svg-icons';
	import * as m from '$msgs';
	import ListDateTime from '$lib/components/DateTime/ListDateTime.svelte';
	import type { EmailDelivery } from '$lib/interfaces/v2/invitee';

	let { delivery, detailed = false }: { delivery: EmailDelivery | null | undefined; detailed?: boolean } =
		$props();

	const state = $derived(delivery?.status ?? 'unknown');
	const shown = $derived(detailed || (state !== 'sent' && state !== 'unknown'));

	const look = {
		sent: { icon: faPaperPlane, words: m.INVITEE_EMAIL_SENT, tone: 'text-success-800-100-token', hint: m.INVITEE_EMAIL_SENT_HINT },
		failed: { icon: faTriangleExclamation, words: m.INVITEE_EMAIL_FAILED, tone: 'text-error-700-200-token font-bold', hint: undefined },
		queued: { icon: faHourglassHalf, words: m.INVITEE_EMAIL_QUEUED, tone: 'text-surface-700-200-token', hint: undefined },
		unconfirmed: { icon: faCircleQuestion, words: m.INVITEE_EMAIL_UNCONFIRMED, tone: 'text-warning-800-100-token font-bold', hint: m.INVITEE_EMAIL_UNCONFIRMED_HINT },
		unknown: { icon: faCircleQuestion, words: m.INVITEE_EMAIL_UNKNOWN, tone: 'text-surface-600-300-token', hint: m.INVITEE_EMAIL_UNKNOWN_HINT }
	} as const;
	const current = $derived(look[state]);
</script>

{#if shown}
	<span class="inline-flex flex-col gap-1">
		<span
			data-testid="invitee-email-delivery"
			data-state={state}
			class="inline-flex items-center gap-2 text-sm {current.tone}"
		>
			<span aria-hidden="true"><Fa icon={current.icon} /></span>
			<span>{current.words()}</span>
			{#if detailed && delivery}
				<span class="font-normal text-surface-600-300-token" data-testid="invitee-email-delivery-at">
					<ListDateTime value={delivery.at} />
				</span>
			{/if}
		</span>
		{#if detailed}
			{#if state === 'failed' && delivery?.error}
				<span class="text-sm break-words text-surface-700-200-token" data-testid="invitee-email-delivery-error">
					{delivery.error}
				</span>
			{:else if current.hint}
				<span class="text-sm text-surface-600-300-token">{current.hint()}</span>
			{/if}
		{/if}
	</span>
{/if}

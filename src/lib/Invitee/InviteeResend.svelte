<script lang="ts">
	/**
	 * Send an invitation's email again -- after a failure, or because the
	 * invitee lost it. Offered only for an invitation that can still be used;
	 * the server refuses the rest, and a second click while the first email
	 * is on its way (already_queued), each with a code worded here.
	 *
	 * The page's data is reloaded afterwards, so the delivery shown just above
	 * becomes "Envoi en cours" and then what Mailgun answered.
	 *
	 * An address that bounced is no longer retried on its own: the server
	 * answers address_rejected, and the page asks first ("rejetée le … —
	 * renvoyer quand même ?"), then sends with force. A person who refused the
	 * organization's mail (address_opted_out) is explained, with no way round.
	 */
	import Fa from 'svelte-fa';
	import { faPaperPlane, faCheck } from '@fortawesome/free-solid-svg-icons';
	import { invalidateAll } from '$app/navigation';
	import * as m from '$msgs';
	import { resendInvitation } from '../../invitee.remote';
	import { dayOf } from './emailDelivery';

	let { uid }: { uid: string } = $props();

	let busy = $state(false);
	let outcome = $state<{ ok: boolean; text: string } | undefined>();
	// Set when the server answered address_rejected: when it was rejected.
	let rejectedSince = $state<string | null | undefined>(undefined);

	function refusal(code: string | undefined): string {
		if (code === 'used') return m.INVITEE_RESEND_USED();
		if (code === 'disabled') return m.INVITEE_RESEND_DISABLED();
		if (code === 'already_queued') return m.INVITEE_RESEND_ALREADY_QUEUED();
		if (code === 'address_opted_out') return m.INVITEE_RESEND_OPTED_OUT();
		return m.INVITEE_RESEND_FAILED();
	}

	async function resend(force = false) {
		busy = true;
		outcome = undefined;
		rejectedSince = undefined;
		try {
			const result = await resendInvitation({ uid, force });
			if (result.code === 'address_rejected') {
				rejectedSince = result.since ?? null;
				return;
			}
			outcome = result.success
				? { ok: true, text: m.INVITEE_RESEND_DONE() }
				: { ok: false, text: refusal(result.code) };
			if (result.success) await invalidateAll();
		} catch {
			outcome = { ok: false, text: m.INVITEE_RESEND_FAILED() };
		} finally {
			busy = false;
		}
	}
</script>

<div class="flex flex-wrap items-center gap-2" data-testid="invitee-resend">
	<button type="button" class="btn min-h-11 variant-ghost-primary" onclick={() => resend()} disabled={busy}>
		<span><Fa icon={faPaperPlane} /></span>
		<span>{m.INVITEE_RESEND()}</span>
	</button>
	{#if rejectedSince !== undefined}
		<span class="flex flex-wrap items-center gap-2" data-testid="invitee-resend-confirm">
			<span class="text-sm text-warning-800-100-token">
				{m.INVITEE_RESEND_REJECTED_CONFIRM({ date: rejectedSince ? dayOf(rejectedSince) : '—' })}
			</span>
			<button type="button" class="btn min-h-11 variant-filled-warning" onclick={() => resend(true)} disabled={busy}>
				{m.INVITEE_RESEND_ANYWAY()}
			</button>
		</span>
	{/if}
	{#if outcome}
		<span
			class="badge {outcome.ok ? 'variant-soft-success' : 'variant-soft-error'}"
			role="status"
			data-testid="invitee-resend-outcome"
		>
			{#if outcome.ok}<span><Fa icon={faCheck} /></span>{/if}
			<span>{outcome.text}</span>
		</span>
	{/if}
</div>

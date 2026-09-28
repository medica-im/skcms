<script lang="ts">
	/**
	 * Send an invitation's email again -- after a failure, or because the
	 * invitee lost it. Offered only for an invitation that can still be used;
	 * the server refuses the rest, and a second click while the first email
	 * is on its way (already_queued), each with a code worded here.
	 *
	 * The page's data is reloaded afterwards, so the delivery shown just above
	 * becomes "Envoi en cours" and then what Mailgun answered.
	 */
	import Fa from 'svelte-fa';
	import { faPaperPlane, faCheck } from '@fortawesome/free-solid-svg-icons';
	import { invalidateAll } from '$app/navigation';
	import * as m from '$msgs';
	import { resendInvitation } from '../../invitee.remote';

	let { uid }: { uid: string } = $props();

	let busy = $state(false);
	let outcome = $state<{ ok: boolean; text: string } | undefined>();

	function refusal(code: string | undefined): string {
		if (code === 'used') return m.INVITEE_RESEND_USED();
		if (code === 'disabled') return m.INVITEE_RESEND_DISABLED();
		if (code === 'already_queued') return m.INVITEE_RESEND_ALREADY_QUEUED();
		return m.INVITEE_RESEND_FAILED();
	}

	async function resend() {
		busy = true;
		outcome = undefined;
		try {
			const result = await resendInvitation(uid);
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
	<button type="button" class="btn min-h-11 variant-ghost-primary" onclick={resend} disabled={busy}>
		<span><Fa icon={faPaperPlane} /></span>
		<span>{m.INVITEE_RESEND()}</span>
	</button>
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

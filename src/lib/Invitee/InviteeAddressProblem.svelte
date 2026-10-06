<script lang="ts">
	/**
	 * On the invitation's page: what went wrong with its address, what to do,
	 * and the fix in place.
	 *
	 * The address is corrected here; the backend then sends the invitation to
	 * the new address straight away (PATCH). A person who refused the
	 * organization's mail is explained, with no fix offered: a new address
	 * would go around their refusal. Nothing when the address is fine. See
	 * InviteeAddressProblem.svelte.test.ts.
	 */
	import Fa from 'svelte-fa';
	import { faTriangleExclamation, faCheck } from '@fortawesome/free-solid-svg-icons';
	import { invalidateAll } from '$app/navigation';
	import * as m from '$msgs';
	import type { Invitee } from '$lib/interfaces/v2/invitee';
	import { addressProblemOf, addressProblemWords, dayOf, OPTED_OUT } from './emailDelivery';
	import { correctInviteeAddress } from '../../invitee.remote';

	let { invitee }: { invitee: Invitee } = $props();

	const problem = $derived(addressProblemOf(invitee));
	const since = $derived(invitee.addressIssue?.since ?? invitee.emailDelivery?.at ?? null);
	// The service's own words, for whoever digs further.
	const raw = $derived(invitee.addressIssue?.detail ?? invitee.emailDelivery?.error ?? null);

	let email = $state('');
	let saving = $state(false);
	let result = $state<{ success: boolean } | undefined>();

	async function correct(event: SubmitEvent) {
		event.preventDefault();
		saving = true;
		result = undefined;
		try {
			result = await correctInviteeAddress({ uid: invitee.uid, email: email.trim() });
			if (result.success) await invalidateAll();
		} catch {
			result = { success: false };
		} finally {
			saving = false;
		}
	}
</script>

{#if problem}
	<div class="card variant-soft-warning p-4 space-y-3" data-testid="invitee-address-problem" data-problem={problem}>
		<p class="flex items-start gap-2">
			<span class="mt-1 text-warning-700-200-token" aria-hidden="true"><Fa icon={faTriangleExclamation} /></span>
			<span>{addressProblemWords[problem]()}</span>
		</p>
		{#if since || raw}
			<p class="text-sm text-surface-700-200-token">
				{#if since}{m.ADDRESS_PROBLEM_SINCE({ date: dayOf(since) })}{/if}
				{#if raw}<span class="block text-xs break-words text-surface-600-300-token">{raw}</span>{/if}
			</p>
		{/if}

		{#if !OPTED_OUT.has(problem)}
			<form class="flex flex-col gap-2 sm:flex-row sm:items-end" onsubmit={correct}>
				<label class="label flex-1">
					<span>{m.ADDRESS_FIX_LABEL()}</span>
					<input class="input min-h-11" type="email" required autocomplete="off" bind:value={email} />
				</label>
				<button type="submit" class="btn min-h-11 variant-filled-primary" disabled={saving || !email.trim()}>
					{m.ADDRESS_FIX_SUBMIT()}
				</button>
				{#if result?.success}
					<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
				{/if}
			</form>
			{#if result}
				<p
					class="text-sm {result.success ? 'text-success-800-100-token' : 'text-error-700-200-token'}"
					role="status"
				>
					{result.success ? m.ADDRESS_FIX_DONE() : m.ADDRESS_FIX_FAILED()}
				</p>
			{/if}
		{/if}
	</div>
{/if}

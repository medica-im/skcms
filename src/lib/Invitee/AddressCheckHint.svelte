<script lang="ts">
	/**
	 * Under an email field: what the backend thinks of the address
	 * (mailer.addresscheck), once it looks complete and typing pauses.
	 *
	 * A typo in a common domain: a one-click suggestion. A domain that cannot
	 * receive mail, an address already known to be bad: a warning. Warnings
	 * only; nothing for a fine address. See AddressCheckHint.svelte.test.ts.
	 */
	import { untrack } from 'svelte';
	import Fa from 'svelte-fa';
	import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
	import * as m from '$msgs';
	import { checkAddresses, type AddressCheck } from '../../invitee.remote';
	import { addressCheckWords } from './emailDelivery';

	let { email = $bindable('') }: { email?: string } = $props();

	const PAUSE_MS = 600;
	const LOOKS_COMPLETE = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;

	let result = $state<AddressCheck | undefined>();

	$effect(() => {
		const typed = email.trim();
		result = undefined;
		if (!LOOKS_COMPLETE.test(typed)) return;
		const timer = setTimeout(async () => {
			// untrack: a remote command inside an effect would otherwise make
			// it re-run on the command's own pending state.
			const [answer] = await untrack(() => checkAddresses([typed]));
			if (answer && email.trim() === typed) result = answer;
		}, PAUSE_MS);
		return () => clearTimeout(timer);
	});

	const warning = $derived(result?.problem ? (addressCheckWords[result.problem]?.() ?? null) : null);
</script>

{#if result && (result.suggestion || warning)}
	<div class="mt-1 space-y-1 text-sm" data-testid="address-check-hint" role="status">
		{#if result.suggestion}
			<p class="flex flex-wrap items-center gap-1">
				<span>{m.ADDRESS_CHECK_SUGGEST()}</span>
				<button
					type="button"
					class="btn btn-sm min-h-11 variant-soft-primary"
					onclick={() => (email = result!.suggestion!)}>{result.suggestion}</button
				>
				<span>?</span>
			</p>
		{/if}
		{#if warning}
			<p class="flex items-start gap-2 text-warning-800-100-token">
				<span class="mt-0.5" aria-hidden="true"><Fa icon={faTriangleExclamation} /></span>
				<span>{warning}</span>
			</p>
		{/if}
	</div>
{/if}

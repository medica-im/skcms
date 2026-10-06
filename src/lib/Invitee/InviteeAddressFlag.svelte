<script lang="ts">
	/**
	 * Next to an invitation's address: this address needs checking.
	 *
	 * Warning colour and icon, the reason as a tooltip and, for a screen
	 * reader, in words -- never colour alone. Nothing when the address is fine
	 * (inviteeFilter.needsCheck). See InviteeAddressProblem.svelte.test.ts.
	 */
	import Fa from 'svelte-fa';
	import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
	import * as m from '$msgs';
	import type { Invitee } from '$lib/interfaces/v2/invitee';
	import { addressProblemOf, addressProblemShort } from './emailDelivery';

	let { invitee }: { invitee: Invitee } = $props();

	const problem = $derived(addressProblemOf(invitee));
	const reason = $derived(problem ? addressProblemShort[problem]() : '');
</script>

{#if problem}
	<span
		class="inline-flex flex-shrink-0 items-center text-warning-700-200-token"
		title={reason}
		data-testid="invitee-address-flag"
		data-problem={problem}
	>
		<span aria-hidden="true"><Fa icon={faTriangleExclamation} /></span>
		<span class="sr-only">{m.ADDRESS_FLAG_SR({ reason })}</span>
	</span>
{/if}

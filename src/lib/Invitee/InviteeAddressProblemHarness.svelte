<script lang="ts">
	/** InviteeAddressProblem whose invitation can be replaced, as the page's reload does (test harness). */
	import InviteeAddressProblem from './InviteeAddressProblem.svelte';
	import type { Invitee } from '$lib/interfaces/v2/invitee';

	let { before, after }: { before: Invitee; after: Invitee } = $props();
	// svelte-ignore state_referenced_locally
	let invitee = $state(before);
</script>

<InviteeAddressProblem {invitee} />
<button type="button" onclick={() => (invitee = after)}>reload</button>

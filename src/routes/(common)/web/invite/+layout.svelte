<script lang="ts">
	import type { Snippet } from 'svelte';
	import { ORIGIN } from '$lib/utils/origin.ts';
	import { LiveDeliveries, setLiveDeliveries } from '$lib/Invitee/liveDeliveries.svelte';

	let { children }: { children: Snippet } = $props();

	// One stream for every invitation page: open from sending to the list and
	// back, so nothing the mail service reports in between is lost.
	const live = setLiveDeliveries(new LiveDeliveries());
	$effect(() => live.connect(`${ORIGIN}/api/v2/invitees/events`));
</script>

{@render children()}

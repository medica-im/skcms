<script lang="ts">
	import EntryContact from './EntryContact.svelte';
	import type { EntryFull } from '$lib/store/directoryStoreInterface';

	let { entries, avatar = true }: { entries: EntryFull[]; avatar?: boolean } = $props();
</script>

<div class="grid w-fit max-w-full grid-cols-[minmax(0,1fr)] gap-4 [overflow-wrap:anywhere]">
	{#each entries as entry (entry.uid)}
		<EntryContact {entry} {avatar} />
	{/each}
</div>

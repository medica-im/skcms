<script lang="ts">
	import EntryInline from './EntryInline.svelte';
	import type { EntryCredit } from '$lib/store/directoryStoreInterface';

	let { data }: { data: EntryCredit[] } = $props();
</script>

<ul class="list">
	{#each data as entry}
		<li><EntryInline data={entry} /></li>
	{/each}
</ul>

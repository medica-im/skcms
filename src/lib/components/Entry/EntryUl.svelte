<script lang="ts">
	import EntryInline from './EntryInline.svelte';
	import type { Entry } from '$lib/store/directoryStoreInterface';
	import type { EntryFull } from '$lib/store/directoryStoreInterface';

	let { data } : { data: EntryFull[]} = $props();
</script>

<ul class="list">
	{#each data as entry}
		<li><EntryInline data={entry} /></li>
	{/each}
</ul>

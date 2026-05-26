<script lang="ts">
	import { entrySlugPageUrl } from '$lib/utils/utils.ts';
    import type { Entry } from '$lib/store/directoryStoreInterface';

    let { data } : { data: Entry[]} = $props();
</script>

	<div class="flex flex-wrap p-4 gap-4">
		{#each data as entry}
			<a data-sveltekit-reload href={entrySlugPageUrl(entry)} class="btn variant-ghost-primary btn-sm">{entry.label||entry.name}</a>
		{/each}
	</div>
<script lang="ts">
	import { page } from '$app/state';
	import { entrySlugPageUrl } from '$lib/utils/utils.ts';
    import type { Entry } from '$lib/store/directoryStoreInterface';

    let { data } : { data: Entry[]} = $props();

	const pathname = page.url.pathname;
</script>

	<div class="flex flex-wrap p-4 gap-4">
		{#each data as entry}
			<a data-sveltekit-reload href={entrySlugPageUrl(entry, pathname)} class="btn variant-ghost-primary btn-sm">{entry.label||entry.name}</a>
		{/each}
	</div>
<script lang="ts">
	import { page } from '$app/state';
	import { entryUrl } from '$lib/utils/utils.ts';
    import type { Entry } from '$lib/store/directoryStoreInterface';

    let { data } : { data: Entry[]} = $props();

	const pathname = page.url.pathname;
	const org = page.data.organization.category.name;
</script>

	<div class="flex flex-wrap p-4 gap-4">
		{#each data as entry}
			<a data-sveltekit-reload href={entryUrl(entry, pathname, org, false)} class="btn variant-ghost-primary btn-sm">{entry.label||entry.name}</a>
		{/each}
	</div>
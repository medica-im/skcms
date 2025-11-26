<script lang="ts">
	import { page } from '$app/state';
	import { Avatar } from '@skeletonlabs/skeleton';
	import { faUser } from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import { entryUrl } from '$lib/utils/utils.ts';
	import type { Entry } from '$lib/store/directoryStoreInterface';

	export let data: Entry[];

	const pathname = page.url.pathname;
	const org = page.data.organization.category.name;
	
</script>

<div class="flex flex-wrap gap-2 p-2">
	{#each data as entry}
		<a href={entryUrl(entry, pathname, org, true)} class="btn btn-sm variant-ghost gap-1 p-1">
			<Avatar src={entry?.avatar?.fb} width="w-12">
				<Fa icon={faUser} />
			</Avatar>
			{entry?.name}
		</a>
	{/each}
</div>

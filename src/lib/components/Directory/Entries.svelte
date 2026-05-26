<script lang="ts">
	import { Avatar } from '@skeletonlabs/skeleton';
	import { faUser } from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import { entrySlugPageUrl } from '$lib/utils/utils.ts';
	import type { Entry } from '$lib/store/directoryStoreInterface';

	export let data: Entry[];


</script>

<div class="flex flex-wrap gap-2 p-2">
	{#each data as entry}
		<a href={entrySlugPageUrl(entry)} class="btn btn-sm variant-ghost gap-1 p-1">
			<Avatar src={entry?.avatar?.sm||entry?.avatar?.lg||entry?.avatar?.raw} width="w-10 lg:w-12">
				<Fa icon={faUser} />
			</Avatar>
			{entry?.name}
		</a>
	{/each}
</div>

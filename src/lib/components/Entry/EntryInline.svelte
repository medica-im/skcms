<script lang="ts">
	import { page } from '$app/state';
	import { Avatar } from '@skeletonlabs/skeleton';
	import { faUser } from '@fortawesome/free-solid-svg-icons';
	import { entrySlugPageUrl } from '$lib/utils/utils.ts';
	import Fa from 'svelte-fa';
	import type { Entry, EntryFull } from '$lib/store/directoryStoreInterface';

	let {data} : {data: EntryFull} = $props();
	const _entry: Entry = page.data.entries.find((e: Entry)=>e.uid==data.uid);
</script>

{#if data && _entry}
	<a href={entrySlugPageUrl(_entry, page.url.pathname)} class="anchor">
		<div class="flex flex-wrap gap-2 items-center">
			<Avatar src={data.avatar.sm||data.avatar.raw} width="w-10">
				<Fa icon={faUser} />
			</Avatar>
			<div>{data?.name}, {data?.effector_type.label}</div>
		</div>
	</a>
{:else}
	data: {JSON.stringify(data)}
{/if}

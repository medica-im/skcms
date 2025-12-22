<script lang="ts">
	import { page } from '$app/state';
	import { Avatar } from '@skeletonlabs/skeleton';
	import { faUser } from '@fortawesome/free-solid-svg-icons';
	import { entryUrl } from '$lib/utils/utils.ts';
	import Fa from 'svelte-fa';
	import type { Entry, EntryFull } from '$lib/store/directoryStoreInterface';

	let {data} : {data: EntryFull} = $props();
	const org = page.data.organization.category.name;
	const _entry: Entry = page.data.entries.find((e: Entry)=>e.uid==data.uid);
</script>

{#if data && _entry}
	<a href={entryUrl(_entry, page.url.pathname, org, true)} class="anchor">
		<div class="flex flex-wrap gap-2 items-center">
			<Avatar src={data.avatar.fb||data.avatar.raw} width="w-10">
				<Fa icon={faUser} />
			</Avatar>
			<div>{data?.name}, {data?.effector_type.label}</div>
		</div>
	</a>
{:else}
	data: {JSON.stringify(data)}
{/if}

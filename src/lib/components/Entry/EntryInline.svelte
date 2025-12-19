<script lang="ts">
	import { page } from '$app/state';
	import { Avatar } from '@skeletonlabs/skeleton';
	import { faUser } from '@fortawesome/free-solid-svg-icons';
	import { entryUrl } from '$lib/utils/utils.ts';
	import Fa from 'svelte-fa';
	import type { Entry } from '$lib/store/directoryStoreInterface';

	let {data} : {data: Entry} = $props();
	const org = page.data.organization.category.name;
</script>

{#if data}
	<a href={entryUrl(data, page.url.pathname, org, true)} class="anchor">
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

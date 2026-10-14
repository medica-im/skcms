<script lang="ts">
	import { Avatar } from '@skeletonlabs/skeleton';
	import type { FreeEntry } from './interface';

	let { data }: { data: FreeEntry[] } = $props();
</script>

{#snippet person(entry: FreeEntry)}
	<div class="flex flex-wrap items-center gap-2">
		<Avatar src={entry.avatar} initials={entry.name} width="w-10" />
		<div>{entry.name}, {entry.occupation}</div>
	</div>
{/snippet}

<ul class="list">
	{#each data as entry}
		<li>
			{#if entry.url}
				<a href={entry.url} class="anchor">{@render person(entry)}</a>
			{:else}
				{@render person(entry)}
			{/if}
		</li>
	{/each}
</ul>

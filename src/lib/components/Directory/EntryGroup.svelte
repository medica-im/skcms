<script lang="ts">
	import EntryComponent from '$lib/components/Directory/Entry.svelte';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers.ts';
	import type { Entry } from '$lib/store/directoryStoreInterface';

	let { data, avatar = true }: { data: Map<string, Entry[]>; avatar: boolean } = $props();
</script>

{#each [...data] as [key, value]}
	<div class="my-6 anchordiv" id={key}>
		<div class="relative inline-block">
			<span class="badge-icon variant-filled-primary absolute -top-1 -right-2 z-5 p-0 m-0">
				{value.length}
			</span>

			<span class="flex badge variant-filled m-0 px-6 py-2 justify-center items-center"
				><h5 class="h5">
					<div class="text-wrap max-w-64 md:text-nowrap md:max-w-fit">
						{#if key}{capitalizeFirstLetter(key)}{/if}
					</div>
				</h5></span
			>
		</div>
	</div>
	<div class="grid grid-cols-1 lg:grid-cols-2 lg:gap-x-16 lg:gap-y-8 space-y-4">
		{#each value as entry (entry.uid)}
			<EntryComponent {entry} displayAvatar={avatar} />
		{/each}
	</div>
{/each}

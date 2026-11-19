<script lang="ts">
	import * as m from '$msgs';
	import type { Managed } from '#lib/store/directoryStoreInterface.ts';

	/** What the entry deals with, as étiquettes: conditions, situations, the Need, by name. */
	let { managed = [] }: { managed?: Managed[] } = $props();
</script>

{#if managed.length}
	<div class="flex flex-wrap items-center gap-2">
		<span id="entry-manages">{m.DIRECTORY_ENTRY_MANAGES()} :</span>
		<ul class="flex flex-wrap gap-2" aria-labelledby="entry-manages">
			{#each managed as item (item.slug)}
				<li class="rounded-token variant-ringed-primary text-primary-800-100-token px-3 py-1 text-base">
					{item.name}
				</li>
			{/each}
		</ul>
	</div>
{/if}

<script lang="ts">
	import * as m from '$msgs';
	import Fa from 'svelte-fa';
	import { faEarthEurope } from '@fortawesome/free-solid-svg-icons';
	import type { Coverage } from '$lib/store/directoryStoreInterface.ts';

	/** Where an entry without premises answers, shown in place of an address. */
	let { coverage = [] }: { coverage?: Coverage[] } = $props();
</script>

{#if coverage.length}
	<div class="px-2">
		<div class="flex items-center p-1">
			<div class="w-9"><Fa icon={faEarthEurope} size="sm" /></div>
			<div>
				<h4 class="h4">{m.DIRECTORY_ENTRY_COVERAGE()}</h4>
			</div>
		</div>
		<ul class="flex flex-wrap gap-2 p-1">
			<li class="w-9"></li>
			{#each coverage as place (place.uid)}
				<li class="rounded-token variant-soft px-3 py-1 text-base">{place.name}</li>
			{/each}
		</ul>
	</div>
{/if}

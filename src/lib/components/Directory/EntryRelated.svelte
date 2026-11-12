<script lang="ts">
	import { base } from '$app/paths';
	import * as m from '$msgs';
	import Fa from 'svelte-fa';
	import { faBuilding, faSitemap } from '@fortawesome/free-solid-svg-icons';
	import type { RelatedEntry } from '$lib/store/directoryStoreInterface.ts';

	/** The entry that runs this one, and the services it runs: links to their pages, never merged into the team. */
	let { runBy = null, services = [] }: { runBy?: RelatedEntry | null; services?: RelatedEntry[] | null } = $props();

	const name = (entry: RelatedEntry) => entry.label || entry.name;
</script>

{#snippet link(entry: RelatedEntry)}
	<a href="{base}/e/{entry.slug}" class="anchor inline-flex min-h-[44px] items-center text-base">
		{name(entry)}<span class="ml-2 text-surface-600">· {entry.effector_type}</span>
	</a>
{/snippet}

{#if runBy}
	<div class="d-flex justify-content-between align-items-start">
		<div class="flex items-center py-2">
			<div class="w-9"><Fa icon={faBuilding} size="sm" /></div>
			<div>
				<h4 class="h4">{m.DIRECTORY_ENTRY_PORTEUR()}</h4>
			</div>
		</div>
		<div class="flex">
			<div class="w-9"></div>
			<div class="py-2">{@render link(runBy)}</div>
		</div>
	</div>
{/if}
{#if services?.length}
	<div class="d-flex justify-content-between align-items-start">
		<div class="flex items-center py-2">
			<div class="w-9"><Fa icon={faSitemap} size="sm" /></div>
			<div>
				<h4 class="h4">{m.DIRECTORY_ENTRY_SERVICES()}</h4>
			</div>
		</div>
		<div class="flex">
			<div class="w-9"></div>
			<ul class="py-2">
				{#each services as service (service.uid)}
					<li>{@render link(service)}</li>
				{/each}
			</ul>
		</div>
	</div>
{/if}

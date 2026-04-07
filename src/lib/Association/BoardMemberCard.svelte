<script lang="ts">
	import { Avatar } from '@skeletonlabs/skeleton';
	import { faUser } from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import * as m from '$msgs';
	import { getLocale } from '../../paraglide/runtime.js';
	import type { BoardMember } from '$lib/interfaces/v2/association';
	import type { Entry } from '$lib/store/directoryStoreInterface';

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString(getLocale(), {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	let {
		member,
		entries,
		categoryLabel = ''
	}: {
		member: BoardMember;
		entries: Entry[];
		categoryLabel?: string;
	} = $props();

	let matchedEntries = $derived(
		entries.filter((e) => e.effector_uid === member.effector_uid)
	);
	let firstEntry = $derived(matchedEntries[0]);
	let name = $derived(firstEntry?.name || member.effector_uid);
	let avatarSrc = $derived(
		firstEntry?.avatar?.sm || firstEntry?.avatar?.lg || firstEntry?.avatar?.raw || ''
	);
	let uniqueTypes = $derived.by(() => {
		const seen = new Set<string>();
		return matchedEntries.filter((e) => {
			const label = e.effector_type?.label;
			if (!label || seen.has(label)) return false;
			seen.add(label);
			return true;
		});
	});
</script>

<div class="flex flex-col lg:flex-row variant-soft-surface rounded-lg overflow-hidden">
	<div class="p-4 shrink-0">
		<Avatar src={avatarSrc} width="w-16 lg:w-20" rounded="rounded-none">
			<Fa icon={faUser} size="lg" />
		</Avatar>
	</div>
	<div class="p-4 space-y-1 flex-1">
		<h3 class="h3">{name}</h3>
		{#if uniqueTypes.length}
			<p class="text-sm opacity-70">
				{#each uniqueTypes as entry, i}
					<a href="/e/{entry.entrySlug}" class="anchor">{entry.effector_type.label}</a>{#if i < uniqueTypes.length - 1}, {/if}
				{/each}
			</p>
		{/if}
		<p class="text-sm opacity-60">{m.COL_START()}: {formatDate(member.start)}</p>
	</div>
</div>

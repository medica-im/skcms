<script lang="ts">
	import Select from '#lib/Web/Select.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import * as m from '$msgs';
	import { getSelectConcern } from './context';
	import CountBadge from './CountBadge.svelte';
	import { normalize } from '#lib/store/directoryStore.ts';
	import { offeredConcerns, type Concern } from '#lib/store/concernTree.ts';
	import type { Entry } from '#lib/store/directoryStoreInterface.ts';
	import type { SelectType } from '#lib/interfaces/select.ts';

	let {
		concerns,
		available,
		seeAlso = []
	}: {
		concerns: Concern[];
		/** The entries the other selectors leave; only the nodes some of them are picked by are offered, and every node when absent. */
		available?: Pick<Entry, 'uid'>[];
		/** The situations or conditions the picked node can lead to, with the listed entries that manage them. */
		seeAlso?: { concern: Concern; entries: unknown[] }[];
	} = $props();

	const selectConcern = getSelectConcern();

	type Item = SelectType & { search: string[]; group: string; groupUid: string | null };

	const pickedUid = $derived(page.url.searchParams.get('concern'));
	const offered = $derived(available ? offeredConcerns(concerns, available, pickedUid) : concerns);

	// A chapter with conditions offered under it is their header, picked like a line, so
	// a condition reads by its own name: on a phone, the chapter's long title repeated on
	// every line left no room for it. The search also matches the chapter's names, so
	// typing a chapter shows it with its conditions; synonyms are never shown.
	const items: Item[] = $derived.by(() => {
		const byUid = new Map(offered.map((concern) => [concern.uid, concern]));
		const topOf = (concern: Concern): Concern => {
			const parent = concern.parent ? byUid.get(concern.parent) : undefined;
			return parent ? topOf(parent) : concern;
		};
		const pathBelow = (concern: Concern, top: Concern): string[] =>
			concern === top ? [] : [...pathBelow(byUid.get(concern.parent!)!, top), concern.name];
		const headers = new Set(
			offered.filter((concern) => topOf(concern) !== concern).map((concern) => topOf(concern).uid)
		);
		return offered
			.filter((concern) => !headers.has(concern.uid))
			.map((concern) => {
				const top = topOf(concern);
				const grouped = top !== concern;
				const label = grouped ? pathBelow(concern, top).join(' › ') : concern.name;
				return {
					value: concern.uid,
					label,
					group: grouped ? top.name : '',
					groupUid: grouped ? top.uid : null,
					search: [label, ...concern.synonyms, ...(grouped ? [top.name, ...top.synonyms] : [])]
				};
			})
			.sort((a, b) => a.group.localeCompare(b.group) || a.label.localeCompare(b.label));
	});

	const matches = (_label: string, filterText: string, option: Item) =>
		option.search.some((name) => normalize(name).includes(normalize(filterText)));

	const picked = $derived.by(() => {
		const concern = offered.find((concern) => concern.uid === pickedUid);
		return concern ? { value: concern.uid, label: concern.name } : null;
	});

	$effect(() => {
		selectConcern.set(picked ? picked.value : null);
	});

	function pick(uid: string | null) {
		const url = new URL(page.url.href);
		if (uid) {
			url.searchParams.set('concern', uid);
		} else {
			url.searchParams.delete('concern');
		}
		const query = url.searchParams.toString();
		goto(query ? `${url.pathname}?${query}` : url.pathname, { reset: false });
	}
</script>

<div class="concern-select text-surface-700 svelte-select">
	<Select
		items={items}
		searchable={true}
		itemFilter={matches}
		groupBy={(item: Item) => item.group}
		groupHeaderSelectable={true}
		createGroupHeaderItem={(group: string, item: Item) => ({ value: item.groupUid, label: group })}
		onchange={(selected: SelectType | undefined) => selected && pick(selected.value)}
		onclear={() => pick(null)}
		placeholder={m.DIRECTORY_CONCERN_PLACEHOLDER()}
		value={picked}
	/>
</div>
{#if seeAlso.length}
	<div class="flex flex-wrap items-center gap-3 pt-1.5 text-surface-700-200-token">
		<span class="text-base">{m.DIRECTORY_CONCERN_SEE_ALSO()}</span>
		{#each seeAlso as item (item.concern.uid)}
			<button
				type="button"
				class="btn relative px-4 variant-soft text-surface-900-50-token min-h-[44px] rounded-token"
				onclick={() => pick(item.concern.uid)}
			>
				<span>{item.concern.name}</span>
				<CountBadge count={item.entries.length} />
			</button>
		{/each}
	</div>
{/if}

<style>
	/* A long name wraps over several lines instead of being cut off; a line stays 44px tall at least. */
	.concern-select {
		--item-height: auto;
		--item-line-height: 1.4;
		--item-padding: 0.7rem 1rem;
		--group-item-padding-left: 2rem;
		--group-title-color: rgb(var(--color-surface-900));
		--group-title-text-transform: none;
		--group-title-padding: 0.7rem 1rem;
		--list-max-height: min(60vh, 28rem);
	}
	:global(.dark) .concern-select {
		--group-title-color: rgb(var(--color-surface-50));
	}
	.concern-select :global(.svelte-select-list .item) {
		white-space: normal;
	}
	.concern-select :global(.svelte-select-list .list-group-title) {
		height: auto;
		line-height: 1.4;
	}
</style>

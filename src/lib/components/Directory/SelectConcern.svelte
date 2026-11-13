<script lang="ts">
	import Select from '$lib/Web/Select.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import * as m from '$msgs';
	import { getSelectConcern } from './context';
	import { normalize } from '$lib/store/directoryStore.ts';
	import type { Concern } from '$lib/store/concernTree.ts';
	import type { SelectType } from '$lib/interfaces/select';

	let {
		concerns,
		seeAlso = []
	}: {
		concerns: Concern[];
		/** The situations or conditions the picked node can lead to, with the listed entries that manage them. */
		seeAlso?: { concern: Concern; entries: unknown[] }[];
	} = $props();

	const selectConcern = getSelectConcern();

	type Item = SelectType & { search: string[] };

	// A condition under a chapter reads "Chapitre › Condition"; the search also
	// matches the synonyms, which are never shown as the name.
	const items: Item[] = $derived.by(() => {
		const byUid = new Map(concerns.map((concern) => [concern.uid, concern]));
		return concerns
			.map((concern) => {
				const parent = concern.parent ? byUid.get(concern.parent) : undefined;
				const label = parent ? `${parent.name} › ${concern.name}` : concern.name;
				return { value: concern.uid, label, search: [label, ...concern.synonyms] };
			})
			.sort((a, b) => a.label.localeCompare(b.label));
	});

	const matches = (_label: string, filterText: string, option: Item) =>
		option.search.some((name) => normalize(name).includes(normalize(filterText)));

	const pickedUid = $derived(page.url.searchParams.get('concern'));
	const picked = $derived(items.find((item) => item.value === pickedUid) ?? null);

	$effect(() => {
		selectConcern.set(picked ? picked.value : null);
	});

	function pick(uid: string | null) {
		const url = new URL(page.url);
		if (uid) {
			url.searchParams.set('concern', uid);
		} else {
			url.searchParams.delete('concern');
		}
		const query = url.searchParams.toString();
		goto(query ? `${url.pathname}?${query}` : url.pathname, { noScroll: true, keepFocus: true });
	}
</script>

<div class="text-surface-700 svelte-select">
	<Select
		items={items}
		searchable={true}
		itemFilter={matches}
		onchange={(selected: SelectType | undefined) => selected && pick(selected.value)}
		onclear={() => pick(null)}
		placeholder={m.DIRECTORY_CONCERN_PLACEHOLDER()}
		value={picked}
	/>
</div>
{#if seeAlso.length}
	<div class="flex flex-wrap items-center gap-2 text-surface-700-200-token">
		<span class="text-base">{m.DIRECTORY_CONCERN_SEE_ALSO()}</span>
		{#each seeAlso as item (item.concern.uid)}
			<button
				type="button"
				class="btn variant-soft text-surface-900-50-token min-h-[44px] rounded-token"
				onclick={() => pick(item.concern.uid)}
			>
				{item.concern.name} ({item.entries.length})
			</button>
		{/each}
	</div>
{/if}

<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { getSelectCategories } from './context';
	import * as m from '$msgs';
	import Fa from 'svelte-fa';
	import { faCheck } from '@fortawesome/free-solid-svg-icons';
	import { createQuery } from '@tanstack/svelte-query';
	import { uniq } from '$lib/utils/utils.ts';
	import type { Entry, CategorizedEntries, Type } from '$lib/store/directoryStoreInterface';
	import type { EffectorType } from '$lib/interfaces/v2/effector';

	let { rCFFE }: { rCFFE: CategorizedEntries } = $props();

	const categories: EffectorType[] = uniq(
		page.data.entries.map((e: Entry) => e.effector_type)
	).sort(function (a, b) {
		return a.uid.localeCompare(b.uid);
	});

	let selectCategories = getSelectCategories();

	const baseUrl = '/api/v1/effector_types/';

	async function downloadRecords() {
		let records = [];
		let initLimit = '?limit=100';
		let next = '';
		do {
			if (next) initLimit = '';
			const url = `${baseUrl}${initLimit}${next}`;
			const res = await fetch(url);
			const data = await res.json();
			records.push(...data.effector_types);
			next = data.meta.next;
		} while (next);
		return records;
	}

	const query = createQuery({
		queryKey: ['types'],
		queryFn: () => downloadRecords()
	});

	const categoryFromUrl: string = $derived.by(() => {
		const typesParam = page.url.searchParams.get('types');
		if (!typesParam) return '';
		const types: string[] = JSON.parse(typesParam);
		const effectorType = categories.find((e) => types.includes(e.uid));
		return effectorType?.name || '';
	});

	$effect(() => {
		const typesParam = page.url.searchParams.get('types');
		if (typesParam) {
			const types: string[] = JSON.parse(typesParam);
			$selectCategories = types;
		} else {
			$selectCategories = [];
		}
	});

	function select(c: string, effectorTypes: Type[]): void {
		if (categoryFromUrl == c || c == '') {
			const url = new URL(page.url);
			url.searchParams.delete('types');
			const newUrl = url.searchParams.toString() ? `${url.pathname}?${url.searchParams}` : url.pathname;
			goto(newUrl, { noScroll: true, keepFocus: true });
		} else {
			let effectorType = effectorTypes.find((x) => x.name == c);
			if (effectorType) {
				const url = new URL(page.url);
				url.searchParams.set('types', JSON.stringify([effectorType.uid]));
				goto(`${url.pathname}?${url.searchParams}`, { noScroll: true, keepFocus: true });
			}
		}
	}
</script>

<div class="flex flex-wrap gap-2 items-center text-surface-700">
	{#if !rCFFE}
		<div class="placeholder"></div>
	{:else if $query.status === 'pending'}
		<div class="placeholder"></div>
	{:else if $query.error}
		<p>Error: {$query.error.message}</p>
	{:else}
		{#each [...rCFFE] as [c, value], index}
			<!-- prettier-ignore -->
			<button onclick={() => {
					select(c, $query.data);
				}} tabindex={index+1}>
				<span
				role="button"
				class="chip {categoryFromUrl === c ? 'variant-filled' : 'variant-soft'}"
			>
				{#if categoryFromUrl === c}<span><Fa icon={faCheck} /></span>{/if}
				<span>{$query.data.find(x=>x.name==c).label}</span>
			</span>
			</button>
		{/each}
		{#if rCFFE.size > 1}
			<button
				onclick={() => {
					select('', $query.data);
				}}
				tabindex={rCFFE.size}
			>
				<span role="button" class="chip {categoryFromUrl === '' ? 'variant-filled' : 'variant-soft'}">
					{#if categoryFromUrl === ''}<span><Fa icon={faCheck} /></span>{/if}
					<span>{m.ADDRESSBOOK_CATEGORIES_ALL()}</span>
				</span>
			</button>
		{/if}
	{/if}
</div>

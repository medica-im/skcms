<script lang="ts">
	import { page } from '$app/state';
	import { getContext } from 'svelte';
	import { onMount } from 'svelte';
	import { getSelectCategories } from './context';
	import * as m from '$msgs';
	import { get } from '@square/svelte-store';
	import Fa from 'svelte-fa';
	import { faCheck } from '@fortawesome/free-solid-svg-icons';
	import { createQuery } from '@tanstack/svelte-query';
	import { uniq } from '$lib/utils/utils.ts';
	import type { Loadable } from '@square/svelte-store';
	import type { Entry, CategorizedEntries, Type } from '$lib/store/directoryStoreInterface';
	import type { EffectorType } from '$lib/interfaces/v2/effector';

	let { categoryOf } = $props();

	const categories: EffectorType[] = uniq(page.data.entries.map((e: Entry) => e.effector_type)).sort(function (a, b) {
			return a.uid.localeCompare(b.uid);
		});

	const categorizedFilteredEffectors = getContext<Loadable<CategorizedEntries>>(
		'categorizedFilteredEffectors'
	);

	const categorizedFullFilteredEffectors = getContext<Loadable<CategorizedEntries>>(
		'categorizedFullFilteredEffectors'
	);

	let selectCategories = getSelectCategories();

	let value = null;

	let category = $state('');

	const baseUrl = '/api/v1/effector_types/';

	async function downloadRecords() {
		let records = [];

		//const res = await fetch(url);
		//const data = await res.json();
		//records.push(...data.effector_types);
		let initLimit = '?limit=100';
		let next = '';
		do {
			if ( next ) initLimit='';
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

	function select(c: string, effectorTypes: Type[]): void {
		if (category == c || c == '') {
			selectCategories.set([]);
			category = '';
		} else {
			category = c;
			let effectorType = effectorTypes.find((x) => x.name == c);
			if (effectorType) {
				selectCategories.set([effectorType.uid]);
			}
		}
	}

	onMount(async () => {
		value = await getValue();
	});

	function getItems(elements) {
		return elements.map(function (x) {
			let dct = { value: x.uid, label: x.name };
			return dct;
		});
	}

	async function getValue() {
		let sElements = get(selectCategories);
		if (!sElements?.length) {
			return null;
		} else {
			if (categories) {
				let val = categories.filter((x) => sElements.includes(x.uid))
					.map(function (x) {
						let dct = { value: x.uid, label: x.name };
						return dct;
					})[0];
				return val;
			}
		}
	}

	function handleClear(event) {
		if (event.detail) {
			selectCategories.set([]);
		}
	}

	function handleChange(event) {
		if (event.detail) {
			selectCategories.set([event.detail.value]);
		}
	}
</script>
<div class="flex flex-wrap gap-2 items-center text-surface-700">
	{#await categorizedFullFilteredEffectors.load()}
		<div class="placeholder"></div>
	{:then}
		{#if $query.status === 'pending'}
			<div class="placeholder"></div>
		{:else if $query.error}
			<p>Error: {$query.error.message}</p>
		{:else}
			{#key category}
				{#each [...$categorizedFullFilteredEffectors] as [c, value], index}
					<!-- prettier-ignore -->
					 <button onclick={() => {
						select(c, $query.data);
					}} tabindex={index+1}>
					<span
					role="button"
					class="chip {category === c ? 'variant-filled' : 'variant-soft'}"
					
				>
					{#if category === c}<span><Fa icon={faCheck} /></span>{/if}
					<span>{$query.data.find(x=>x.name==c).label}</span>
				</span>
				</button>
				{/each}
				{#if $categorizedFullFilteredEffectors.size > 1}
				<button onclick={() => {
							select('', $query.data);
						}} tabindex={$categorizedFullFilteredEffectors.size}>
					<span
						role="button"
						class="chip {category === '' ? 'variant-filled' : 'variant-soft'}"
						
					>
						{#if category === ''}<span><Fa icon={faCheck} /></span>{/if}
						<span>{m.ADDRESSBOOK_CATEGORIES_ALL()}</span>
					</span>
					</button>
				{/if}
			{/key}
		{/if}
	{/await}
</div>

<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import * as m from '$msgs';
	import Fa from 'svelte-fa';
	import { faCheck } from '@fortawesome/free-solid-svg-icons';
	import { getFacetSelection } from './context';
	import { FACET_LABELS, FACET_TITLES } from './facetLabels';
	import { NO_FACETS, optionsOf, selectorsShown, type FacetSelection } from '$lib/store/facetFilters.ts';
	import { facetsFromParams, facetsToParams } from '$lib/store/facetUrl.ts';
	import type { Entry } from '$lib/store/directoryStoreInterface.ts';

	/**
	 * The selectors over who an entry is for and who may contact it. Each shows only
	 * when the entries could be narrowed by it, so a directory that stores no facets
	 * shows none. The selection lives in the page URL, like the other selectors.
	 */
	let { entries }: { entries: Entry[] } = $props();

	const facetSelection = getFacetSelection();

	const selection = $derived(facetsFromParams(page.url.searchParams));
	const shown = $derived(selectorsShown(entries));
	const chosen = $derived(JSON.stringify(selection) !== JSON.stringify(NO_FACETS));

	$effect(() => {
		facetSelection.set(selection);
	});

	const LABELS = FACET_LABELS;
	const TITLES = FACET_TITLES;

	function apply(next: FacetSelection) {
		const url = new URL(page.url);
		facetsToParams(next, url.searchParams);
		const query = url.searchParams.toString();
		goto(query ? `${url.pathname}?${query}` : url.pathname, { noScroll: true, keepFocus: true });
	}

	const toggle = <T extends string>(list: T[], value: T): T[] =>
		list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

	function setAge(raw: string) {
		const age = raw.trim() === '' ? null : Number(raw);
		apply({ ...selection, age: age !== null && Number.isInteger(age) && age >= 0 && age <= 120 ? age : null });
	}

	const chip = (on: boolean) =>
		`btn min-h-[44px] rounded-token ${on ? 'variant-filled' : 'variant-soft'}`;
</script>

{#if shown.length}
	<div class="space-y-3 text-surface-700">
		{#each shown as key (key)}
			{#if key === 'age'}
				<label class="flex flex-wrap items-center gap-2 text-base">
					<span>{TITLES.age()}</span>
					<input
						type="number"
						inputmode="numeric"
						min="0"
						max="120"
						class="input w-24 min-h-[44px] rounded-token text-base"
						value={selection.age ?? ''}
						onchange={(event) => setAge(event.currentTarget.value)}
					/>
					<span>{m.DIRECTORY_FACET_AGE_UNIT()}</span>
				</label>
			{:else if key === 'access'}
				<fieldset class="flex flex-wrap items-center gap-2">
					<legend class="mb-1 text-base">{TITLES.access()}</legend>
					{#each optionsOf(entries, 'access') as option (option.value)}
						{@const on = selection.access === option.value}
						<button
							type="button"
							class={chip(on)}
							aria-pressed={on}
							onclick={() => apply({ ...selection, access: on ? null : (option.value as typeof selection.access) })}
						>
							{#if on}<Fa icon={faCheck} />{/if}
							<span>{LABELS.access[option.value as keyof typeof LABELS.access]()} ({option.count})</span>
						</button>
					{/each}
				</fieldset>
			{:else if key === 'careLevels' || key === 'audiences'}
				<fieldset class="flex flex-wrap items-center gap-2">
					<legend class="mb-1 text-base">{TITLES[key]()}</legend>
					{#each optionsOf(entries, key) as option (option.value)}
						{@const list = selection[key] as string[]}
						{@const on = list.includes(option.value)}
						{@const labels = LABELS[key] as Record<string, () => string>}
						<button
							type="button"
							class={chip(on)}
							aria-pressed={on}
							onclick={() => apply({ ...selection, [key]: toggle(list, option.value) })}
						>
							{#if on}<Fa icon={faCheck} />{/if}
							<span>{labels[option.value]()} ({option.count})</span>
						</button>
					{/each}
				</fieldset>
			{:else if key === 'free' || key === 'anonymous'}
				<button
					type="button"
					class={chip(selection[key])}
					aria-pressed={selection[key]}
					onclick={() => apply({ ...selection, [key]: !selection[key] })}
				>
					{#if selection[key]}<Fa icon={faCheck} />{/if}
					<span>{key === 'free' ? m.DIRECTORY_FACET_FREE() : m.DIRECTORY_FACET_ANONYMOUS()}</span>
				</button>
			{/if}
		{/each}
		{#if chosen}
			<button type="button" class="btn variant-ghost min-h-[44px] rounded-token" onclick={() => apply(NO_FACETS)}>
				{m.DIRECTORY_FACET_CLEAR()}
			</button>
		{/if}
	</div>
{/if}

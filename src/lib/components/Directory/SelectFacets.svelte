<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import * as m from '$msgs';
	import Fa from 'svelte-fa';
	import { faCheck, faXmark } from '@fortawesome/free-solid-svg-icons';
	import { getFacetSelection } from './context';
	import { FACET_LABELS, FACET_TITLES } from './facetLabels';
	import CountBadge from './CountBadge.svelte';
	import {
		ageBandsOf,
		booleanCountOf,
		facetCountsOf,
		filterByFacets,
		optionsOf,
		selectorsShown,
		type AgeBand,
		type FacetSelection
	} from '#lib/store/facetFilters.ts';
	import { facetsFromParams, facetsToParams } from '#lib/store/facetUrl.ts';
	import type { Entry } from '#lib/store/directoryStoreInterface.ts';

	/**
	 * The selectors over who an entry is for and who may contact it. Each shows only
	 * when the entries could be narrowed by it, so a directory that stores no facets
	 * shows none. The selection lives in the page URL, like the other selectors.
	 *
	 * `entries` decides which selectors and which values show, so they never jump
	 * away; `base` is what the other selectors (condition, type, place…) leave, and
	 * decides what each value would still reach: a value nothing is left for is
	 * disabled, unless it is chosen, which stays removable.
	 */
	let { entries, base }: { entries: Entry[]; base?: Entry[] } = $props();

	const facetSelection = getFacetSelection();

	const selection = $derived(facetsFromParams(new URLSearchParams(page.url.searchParams.toString())));
	const rows = $derived(base ?? entries);
	const shown = $derived(selectorsShown(entries));

	$effect(() => {
		facetSelection.set(selection);
	});

	const LABELS = FACET_LABELS;
	const TITLES = FACET_TITLES;

	const countsOf = (key: 'access' | 'careLevels' | 'audiences') =>
		new Map(facetCountsOf(rows, selection, key).map(({ value, count }) => [value, count]));

	const counts = $derived({
		access: countsOf('access'),
		careLevels: countsOf('careLevels'),
		audiences: countsOf('audiences')
	});

	// Age is a number while nothing narrows the list; once something does, the ages
	// worth telling apart among the entries left are few, and bands say it better.
	const ageEntries = $derived(filterByFacets(rows, { ...selection, age: null }));
	const bands = $derived(ageBandsOf(ageEntries));
	const showBands = $derived(ageEntries.length < entries.length && bands.length >= 2);
	const pickedBand = $derived(
		selection.age === null
			? null
			: ([...bands].reverse().find((band) => band.from <= selection.age!)?.from ?? null)
	);

	const bandLabel = ({ from, to }: AgeBand) =>
		to === null
			? m.DIRECTORY_FACET_AGE_FROM({ min: from })
			: from === to
				? m.DIRECTORY_FACET_AGE_EXACT({ age: from })
				: m.DIRECTORY_FACET_AGE_BAND({ min: from, max: to });

	function apply(next: FacetSelection) {
		const url = new URL(page.url.href);
		facetsToParams(next, url.searchParams);
		const query = url.searchParams.toString();
		goto(query ? `${url.pathname}?${query}` : url.pathname, { reset: false });
	}

	const toggle = <T extends string>(list: T[], value: T): T[] =>
		list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

	function setAge(raw: string) {
		const age = raw.trim() === '' ? null : Number(raw);
		apply({ ...selection, age: age !== null && Number.isInteger(age) && age >= 0 && age <= 120 ? age : null });
	}

	const chip = (on: boolean, off = false) =>
		`btn relative min-h-[44px] px-4 rounded-token ${on ? 'variant-filled' : 'variant-soft text-surface-900-50-token'} ${off ? 'opacity-50 cursor-not-allowed' : ''}`;

	// A band reads as pressed when it holds the age; the segment is a label over a native radio.
	const segment = (on: boolean, off: boolean) =>
		`relative inline-flex min-h-[44px] cursor-pointer items-center pl-2 pr-4 text-base rounded-token has-[:focus-visible]:ring-2 ${on ? 'variant-filled' : 'variant-soft text-surface-900-50-token'} ${off ? 'opacity-50 cursor-not-allowed' : ''}`;
</script>

{#if shown.length}
	<div class="space-y-3 text-surface-700-200-token">
		{#each shown as key (key)}
			{#if key === 'age' && showBands}
				<fieldset
					class="mt-2 inline-flex flex-wrap gap-3 rounded-container-token bg-surface-200-700-token p-1"
				>
					<legend class="sr-only">{TITLES.age()}</legend>
					<label class={segment(pickedBand === null, false)}>
						<input
							type="radio"
							name="age-band"
							class="sr-only"
							checked={pickedBand === null}
							onchange={() => apply({ ...selection, age: null })}
						/>
						<span>{m.DIRECTORY_FACET_AGE_ALL()}</span>
						<CountBadge count={ageEntries.length} />
					</label>
					{#each bands as band (band.from)}
						{@const on = pickedBand === band.from}
						{@const off = band.count === 0 && !on}
						<label class={segment(on, off)}>
							<input
								type="radio"
								name="age-band"
								class="sr-only"
								checked={on}
								disabled={off}
								onchange={() => apply({ ...selection, age: band.from })}
							/>
							<span>{bandLabel(band)}</span>
							<CountBadge count={band.count} />
						</label>
					{/each}
				</fieldset>
			{:else if key === 'age'}
				<div class="flex flex-wrap items-center gap-2">
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
					{#if selection.age !== null}
						<button
							type="button"
							class="btn-icon variant-ringed-surface min-h-[44px] min-w-[44px] rounded-token"
							aria-label={m.DIRECTORY_FACET_AGE_CLEAR()}
							title={m.DIRECTORY_FACET_AGE_CLEAR()}
							onclick={() => apply({ ...selection, age: null })}
						>
							<Fa icon={faXmark} />
						</button>
					{/if}
				</div>
			{:else if key === 'access'}
				<fieldset class="flex flex-wrap items-center gap-3">
					<legend class="mb-2 text-base">{TITLES.access()}</legend>
					{#each optionsOf(entries, 'access') as option (option.value)}
						{@const on = selection.access === option.value}
						{@const count = counts.access.get(option.value) ?? 0}
						{@const off = count === 0 && !on}
						<button
							type="button"
							class={chip(on, off)}
							aria-pressed={on}
							disabled={off}
							onclick={() => apply({ ...selection, access: on ? null : (option.value as typeof selection.access) })}
						>
							{#if on}<Fa icon={faCheck} />{/if}
							<span>{LABELS.access[option.value as keyof typeof LABELS.access]()}</span>
							<CountBadge {count} />
						</button>
					{/each}
				</fieldset>
			{:else if key === 'careLevels' || key === 'audiences'}
				<fieldset class="flex flex-wrap items-center gap-3">
					<legend class="mb-2 text-base">{TITLES[key]()}</legend>
					{#each optionsOf(entries, key) as option (option.value)}
						{@const list = selection[key] as string[]}
						{@const on = list.includes(option.value)}
						{@const count = counts[key].get(option.value) ?? 0}
						{@const off = count === 0 && !on}
						{@const labels = LABELS[key] as Record<string, () => string>}
						<button
							type="button"
							class={chip(on, off)}
							aria-pressed={on}
							disabled={off}
							onclick={() => apply({ ...selection, [key]: toggle(list, option.value) })}
						>
							{#if on}<Fa icon={faCheck} />{/if}
							<span>{labels[option.value]()}</span>
							<CountBadge {count} />
						</button>
					{/each}
				</fieldset>
			{:else if key === 'free' || key === 'anonymous'}
				{@const count = booleanCountOf(rows, selection, key)}
				{@const off = !selection[key] && count === 0}
				<button
					type="button"
					class={chip(selection[key], off)}
					aria-pressed={selection[key]}
					disabled={off}
					onclick={() => apply({ ...selection, [key]: !selection[key] })}
				>
					{#if selection[key]}<Fa icon={faCheck} />{/if}
					<span>{key === 'free' ? m.DIRECTORY_FACET_FREE() : m.DIRECTORY_FACET_ANONYMOUS()}</span>
					<CountBadge {count} />
				</button>
			{/if}
		{/each}
	</div>
{/if}

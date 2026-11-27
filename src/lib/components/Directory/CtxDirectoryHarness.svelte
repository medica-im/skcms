<!--
	Test harness reproducing CtxDirectory's derivation chain.

	CtxDirectory itself reads page.data from $app/state and renders the whole
	FullDirectory tree, so mounting it in a test would mean faking SvelteKit
	internals and half the address book — the test would then mostly prove the
	mocks work. What actually needs protecting through the Svelte 5 rewrite is
	narrower and is reproduced faithfully here:

	  selector store changes
	    -> $derived fullFilteredEntries
	    -> $derived filteredEntries
	    -> $derived categorizedFilteredEntries
	    -> rendered list

	Same context stores, same functions from directoryStore, same $derived.by
	shape as CtxDirectory. If the rewrite breaks propagation anywhere along that
	chain, the rendered list here stops following the selectors.

	Keep this in step with CtxDirectory's chain: it is a stand-in for it, and a
	stand-in that has drifted proves nothing.
-->
<script lang="ts">
	import {
		setTerm,
		getTerm,
		setSelectCategories,
		getSelectCategories,
		setSelectedDepartment,
		getSelectedDepartment,
		setSelectedCommunesUids,
		getSelectedCommunesUids,
		setSelectFacility,
		getSelectFacility,
		setSelectedTags,
		getSelectedTags,
		setSelectSituation,
		getSelectSituation,
		setSelectConcern,
		getSelectConcern,
		setFacetSelection,
		getFacetSelection
	} from './context';
	import {
		fullFilteredEntriesF,
		filteredEntriesF,
		categorizedFilteredEffectorsF,
		categoryOfF
	} from '#lib/store/directoryStore.ts';
	import { filterByFacets } from '#lib/store/facetFilters.ts';
	import { filterByConcern, type Concern } from '#lib/store/concernTree.ts';
	import type { Entry, Situation } from '#lib/store/directoryStoreInterface.ts';
	import type { Organization } from '#lib/interfaces/organization.ts';

	let {
		entries = [],
		situations = [],
		organization = undefined,
		currentOrg = null,
		limitCategories = [],
		active = true,
		concerns = []
	}: {
		concerns?: Concern[];
		entries?: Entry[];
		situations?: Situation[];
		organization?: Organization;
		currentOrg?: boolean | null;
		limitCategories?: string[];
		active?: boolean | null;
	} = $props();

	setTerm();
	setSelectCategories();
	setSelectedDepartment();
	setSelectedCommunesUids();
	setSelectFacility(null);
	setSelectedTags();
	setSelectSituation();
	setSelectConcern();
	setFacetSelection();

	// Exported so a test can drive the selectors exactly as the real selector
	// components do — by writing to the context stores, not by setting props.
	export const stores = {
		term: getTerm(),
		selectCategories: getSelectCategories(),
		selectDepartment: getSelectedDepartment(),
		selectCommunes: getSelectedCommunesUids(),
		selectFacility: getSelectFacility(),
		selectTags: getSelectedTags(),
		selectSituation: getSelectSituation(),
		selectConcern: getSelectConcern(),
		facetSelection: getFacetSelection()
	};

	const {
		term,
		selectCategories,
		selectDepartment,
		selectCommunes,
		selectFacility,
		selectTags,
		selectSituation,
		selectConcern,
		facetSelection
	} = stores;

	let rFullFilteredEntries = $derived.by(() =>
		fullFilteredEntriesF(
			situations,
			entries,
			$selectSituation,
			currentOrg,
			organization,
			limitCategories,
			active
		)
	);

	let rFilteredEntries = $derived.by(() =>
		filterByConcern(
			filterByFacets(
				filteredEntriesF(
					rFullFilteredEntries,
					$selectCategories,
					$selectDepartment,
					$selectCommunes,
					$selectFacility,
					$term,
					$selectTags
				),
				$facetSelection
			),
			concerns,
			$selectConcern
		)
	);

	// The selectors offer what the condition and the facets leave, as in CtxDirectory.
	const rNarrowed = $derived.by(() =>
		filterByConcern(filterByFacets(rFullFilteredEntries, $facetSelection), concerns, $selectConcern)
	);
	const categoryOf = $derived.by(() =>
		categoryOfF(rNarrowed, $selectCommunes, $selectDepartment, $selectFacility)
	);

	let rCategorizedFilteredEntries = $derived.by(() =>
		categorizedFilteredEffectorsF(rFilteredEntries, null, $selectSituation)
	);
</script>

<div data-testid="count">{rFilteredEntries.length}</div>

<ul data-testid="entries">
	{#each rFilteredEntries as entry (entry.uid)}
		<li data-testid="entry">{entry.name}</li>
	{/each}
</ul>

<ul data-testid="type-options">
	{#each categoryOf as type (type.uid)}
		<li data-testid="type-option">{type.name}</li>
	{/each}
</ul>

<ul data-testid="categories">
	{#each [...rCategorizedFilteredEntries.keys()] as category (category)}
		<li data-testid="category">{category}</li>
	{/each}
</ul>

<script lang="ts">
	import Select from 'svelte-select';
	import { onMount } from 'svelte';
	import * as m from '$msgs';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import {
		getSelectCategories,
		getSelCatVal,
		getDirectoryRedirect,
		getSelectFacility
	} from '$lib/components/Directory/context';
	import { normalize } from '$lib/helpers/stringHelpers.ts';
	import type { Type } from '$lib/store/directoryStoreInterface';

	let { categoryOf }: { categoryOf: Type[] } = $props();

	const itemFilter = (label: any, filterText: any, option: any) => {
		const normalizedFilterText = normalize(filterText);
		const name = normalize(option.name);
		const synonyms = option.synonyms?.map((s: string) => normalize(s));
		return (
			name.includes(normalizedFilterText) || synonyms?.some((s: string) => s.includes(normalizedFilterText))
		);
	};
	let items = $derived.by(() => {
		return categoryOf.sort(function (a, b) {
			return a.name.localeCompare(b.name);
		});
	});
	const label = 'label';
	const itemId = 'uid';
	let focused = $state(false);
	let listOpen = $state(false);
	let srcElement = $state();

	let selCatVal = getSelCatVal();
	let selectCategories = getSelectCategories();
	let selectFacility = getSelectFacility();
	let directoryRedirect = getDirectoryRedirect();

	onMount(() => {
		const typesParam: string | null = page.url.searchParams.get('types');
		if (typesParam != null) {
			const types: string[] = JSON.parse(typesParam);
			$selectCategories = types;
			const effector_type = categoryOf.find((e) => types.includes(e.uid));
			if (effector_type) {
				$selCatVal = effector_type;
			}
		}
	});

	function handleFocus(e: CustomEvent) {
		focused = true;
		listOpen = true;
		srcElement = e.detail.srcElement;
	}

	const handleClear = async (event: CustomEvent) => {
		if (event.detail) {
			//if (srcElement) srcElement.blur();
			$selectCategories = [];
			if (page.url.searchParams.has('types')) {
				page.url.searchParams.delete('types');
				await goto(page.url.pathname + '?' + page.url.searchParams);
			}
			if (srcElement) srcElement.blur();
			if (page.url.pathname != '/annuaire' && $directoryRedirect) {
				let url = '/annuaire';
				if ($selectFacility) {
					url += `?facility=${$selectFacility}`;
				}
				await goto(url);
			}
		} else {
			if (srcElement) srcElement.blur();
		}
	};

	function handleChange(event: CustomEvent) {
		if (event.detail) {
			console.log("event.detail", event.detail);
			selectCategories.set([event.detail.uid]);
			if (srcElement) srcElement.blur();
			if (page.url.pathname != '/annuaire' && $directoryRedirect) {
				const typesParam = JSON.stringify(`[${event.detail.uid}]`);
				let urlParams = `?types=${typesParam}`;
				if ($selectFacility) {
					urlParams += `&facility=${$selectFacility}`;
				}
				goto(`/annuaire${urlParams}`);
			}
		} else {
			if (srcElement) srcElement.blur();
		}
	}
</script>
<!--
srcElement: {srcElement}<br>
$selectCategories: {JSON.stringify($selectCategories)}<br>
$selCatVal: {JSON.stringify($selCatVal)}<br>
categoryOf: {categoryOf} ({categoryOf.length})<br />
-->
{#if !categoryOf && !items && !$selCatVal}
	<div class="text-surface-700 theme">
		<Select loading={true} placeholder={m.ADDRESSBOOK_CATEGORIES_PLACEHOLDER()} />
	</div>
{:else}
	<div class="text-surface-700 z-auto theme">
		<Select
			{itemFilter}
			{label}
			{itemId}
			{items}
			{focused}
			{listOpen}
			searchable={true}
			on:focus={handleFocus}
			on:change={handleChange}
			on:clear={handleClear}
			bind:value={$selCatVal}
			placeholder={m.ADDRESSBOOK_CATEGORIES_PLACEHOLDER()}
		/>
	</div>
{/if}

<style>
	/*
			CSS variables can be used to control theming.
			https://github.com/rob-balfre/svelte-select/blob/master/docs/theming_variables.md
	*/
	.theme {
		--border-radius: var(--theme-rounded-container);
		--border-color: rgb(var(--color-secondary-500));
		--border-focused: 1px solid rgb(var(--color-secondary-500));
		--border-hover: 1px solid rgb(var(--color-secondary-500));
		--item-active-outline: 1px solid rgb(var(--color-secondary-500));
		--item-outline: 1px solid rgb(var(--color-secondary-500));
		--clear-select-focus-outline: 1px solid rgb(var(--color-secondary-500));
		--height: 3rem;
	}
</style>

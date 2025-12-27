<script lang="ts">
	import Select from 'svelte-select';
	import { onMount } from 'svelte';
	import * as m from "$msgs";
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import {
		getSelectCategories,
		getSelCatVal,
		getDirectoryRedirect,
		getSelectFacility,
	} from '$lib/components/Directory/context';
	import { getItems } from '$lib/components/Directory/SelectCategory.ts';
	import type { Type } from '$lib/store/directoryStoreInterface';

	let { categoryOf } = $props();

	const label = 'label';
	const itemId = 'value';
	let srcElement = $state();

	let selCatVal = getSelCatVal();
	let selectCategories = getSelectCategories();
	let selectFacility = getSelectFacility();
	let directoryRedirect = getDirectoryRedirect();
	let filterText: string = $state("");
	const itemFilter = () => true; // turn off internal filter

	onMount(async () => {
		const typesParam: string |null = page.url.searchParams.get('types');
		if (typesParam != null) {
		    const types: string[] = JSON.parse(typesParam);
			$selectCategories=types;
			const effector_types = await categoryOf.load();
			const effector_type = effector_types.find(e=>types.includes(e.uid));
			$selCatVal = {value: effector_type.uid, label: effector_type.label};
		}
	});

	

	function getValue(selectCategories: string[], categories: Type[]) {
		if (categories) {
			let val = categories
				.filter((x) => selectCategories.includes(x.uid))
				.map(function (x) {
					let dct = { value: x.uid, label: x.name };
					return dct;
				})[0];
			return val;
		}
	};

	function handleFocus(e) {
		srcElement=e.detail.srcElement;
    };

	const handleClear = async (event: CustomEvent) => {
		if (event.detail) {
			if (srcElement) srcElement.blur();
			$selectCategories=[];
			if (page.url.searchParams.has('types')) {
				page.url.searchParams.delete('types');
		    	await goto(page.url.pathname+"?"+page.url.searchParams);
			}
		    if (page.url.pathname != '/annuaire' && $directoryRedirect) {
				let url = '/annuaire';
				if ( $selectFacility ) {
					url += `?facility=${$selectFacility}`
				}
			    await goto(url);
		    }
		}
		if (srcElement) srcElement.blur();
	};

	function handleChange(event: CustomEvent) {
		if (event.detail && event.detail.value) {
			selectCategories.set([event.detail.value]);
			if (srcElement) srcElement.blur();
			const typesParam = JSON.stringify(`[${event.detail.value}]`)
			let urlParams = `?types=${typesParam}`;
			if ( $selectFacility ) {
                urlParams += `&facility=${$selectFacility}`
			}
			if (page.url.pathname != '/annuaire' && $directoryRedirect) {
				goto(`/annuaire${urlParams}`);
			}
		} else {
			if (srcElement) srcElement.blur();
		}
	};
</script>
<!--srcElement: {srcElement}<br>
$selectCategories: {JSON.stringify($selectCategories)}<br>
$selCatVal: {JSON.stringify($selCatVal)}<br>
categoryOf: {$categoryOf} ({$categoryOf.length})<br />
filterText: {filterText}-->
{#await categoryOf.load()}
	<div class="text-surface-700 theme">
		<Select loading={true} placeholder={m.ADDRESSBOOK_CATEGORIES_PLACEHOLDER()} />
	</div>
{:then cOf}
	<div class="text-surface-700 z-auto theme">
		<Select
			{itemFilter}
			{label}
			{itemId}
			items={getItems(cOf, filterText)}
			searchable={true}
			on:focus={handleFocus}
			on:change={handleChange}
			on:clear={handleClear}
			bind:value={$selCatVal}
			bind:filterText
			placeholder={m.ADDRESSBOOK_CATEGORIES_PLACEHOLDER()}
		/>
	</div>
{/await}

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

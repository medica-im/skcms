<script lang="ts">
	import Select from 'svelte-select';
	import NoOptions from '$lib/Web/NoOptions.svelte';
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

	const dirPath = page.data.directory.setting.path || "/";

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
	let srcElement: HTMLElement | undefined = $state();

	let selCatVal = getSelCatVal();
	let selectCategories = getSelectCategories();
	let selectFacility = getSelectFacility();
	let directoryRedirect = getDirectoryRedirect();

	const selectionFromUrl: Type | null = $derived.by(() => {
		const typesParam = page.url.searchParams.get('types');
		if (!typesParam) return null;
		const types: string[] = JSON.parse(typesParam);
		const effector_type = categoryOf.find((e) => types.includes(e.uid));
		return effector_type || null;
	});

	$effect(() => {
		const sel = selectionFromUrl;
		if (sel) {
			$selectCategories = [sel.uid];
			$selCatVal = sel;
		} else {
			$selectCategories = [];
			$selCatVal = null;
		}
	});

	function handleFocus(e: CustomEvent) {
		focused = true;
		listOpen = true;
		srcElement = e.detail.srcElement;
	}

	const handleClear = async (event: CustomEvent) => {
		if (event.detail) {
			if (srcElement) srcElement.blur();
			if (page.url.pathname == dirPath && page.url.searchParams.has('types')) {
				const url = new URL(page.url);
				url.searchParams.delete('types');
				const newUrl = url.searchParams.toString() ? `${url.pathname}?${url.searchParams}` : url.pathname;
				goto(newUrl, { noScroll: true, keepFocus: true });
			} else if (page.url.pathname != dirPath && $directoryRedirect) {
				if ($selectFacility) {
					await goto(`${dirPath}?facility=${$selectFacility}`);
				} else {
					await goto(dirPath);
				}
			}
		} else {
			if (srcElement) srcElement.blur();
		}
	};

	function handleChange(event: CustomEvent) {
		if (event.detail) {
			if (srcElement) srcElement.blur();
			if (page.url.pathname == dirPath) {
				const url = new URL(page.url);
				url.searchParams.set('types', JSON.stringify([event.detail.uid]));
				goto(`${url.pathname}?${url.searchParams}`, { noScroll: true, keepFocus: true });
			} else if ($directoryRedirect) {
				const typesParam = JSON.stringify([event.detail.uid]);
				let urlParams = `?types=${typesParam}`;
				if ($selectFacility) {
					urlParams += `&facility=${$selectFacility}`;
				}
				goto(`${dirPath}${urlParams}`);
			}
		} else {
			if (srcElement) srcElement.blur();
		}
	}
</script>
{#if !categoryOf || !items}
	<div class="text-surface-700 svelte-select">
		<Select loading={true} placeholder={m.ADDRESSBOOK_CATEGORIES_PLACEHOLDER()} />
	</div>
{:else}
	<div class="text-surface-700 z-auto svelte-select">
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
			value={selectionFromUrl}
			placeholder={m.ADDRESSBOOK_CATEGORIES_PLACEHOLDER()}
		><NoOptions slot="empty" /></Select>
	</div>
{/if}

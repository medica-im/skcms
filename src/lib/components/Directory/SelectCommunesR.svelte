<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import Select from 'svelte-select';
	import NoOptions from '$lib/Web/NoOptions.svelte';
	import * as m from '$msgs';
	import { getSelectedCommunesUids, getSelectedCommunesChoices } from './context';
	import type { Commune } from '$lib/interfaces/geography.interface.ts';
	import type { SelectType } from '$lib/interfaces/select';

	let { communeOf }: { communeOf: Commune[] } = $props();

	let multiple: boolean = $state(false);
	const label = 'label';
	const itemId = 'value';

	let selectedCommunes = getSelectedCommunesUids();
	let selectedCommunesChoices = getSelectedCommunesChoices();

	function getItems(communes: Commune[]) {
		return communes.map(function (x) {
			return { value: x.uid, label: x.name };
		});
	}

	function getChoices(communeUids: string[], allCommunes: Commune[]): SelectType[] {
		return allCommunes
			.filter((x) => communeUids.includes(x.uid))
			.map(function (x) {
				return { value: x.uid, label: x.name };
			});
	}

	const selectionFromUrl: SelectType | SelectType[] | null = $derived.by(() => {
		const communesParam = page.url.searchParams.get('communes');
		if (!communesParam) return null;
		const communeUids: string[] = JSON.parse(communesParam);
		const choices = getChoices(communeUids, communeOf);
		if (!choices.length) return null;
		if (multiple) {
			return choices;
		} else {
			return choices[0];
		}
	});

	$effect(() => {
		const communesParam = page.url.searchParams.get('communes');
		if (communesParam) {
			const communeUids: string[] = JSON.parse(communesParam);
			$selectedCommunes = communeUids;
			$selectedCommunesChoices = getChoices(communeUids, communeOf);
		} else {
			$selectedCommunes = [];
			$selectedCommunesChoices = null;
		}
	});

	function handleClear(event: CustomEvent) {
		if (event.detail) {
			const url = new URL(page.url);
			url.searchParams.delete('communes');
			const newUrl = url.searchParams.toString() ? `${url.pathname}?${url.searchParams}` : url.pathname;
			goto(newUrl, { noScroll: true, keepFocus: true });
		}
	}

	function handleChange(event: CustomEvent) {
		if (event.detail) {
			let uids: string[];
			if (Array.isArray(event.detail)) {
				uids = event.detail.map((e: SelectType) => e.value);
			} else {
				uids = [event.detail.value];
			}
			const url = new URL(page.url);
			url.searchParams.set('communes', JSON.stringify(uids));
			goto(`${url.pathname}?${url.searchParams}`, { noScroll: true, keepFocus: true });
		}
	}
</script>

<!--
{communeOf ? JSON.stringify(communeOf.slice(0, 2)) : communeOf}<br />
{communeOf ? communeOf?.length : 0} commune(s)<br />
$selectedCommunes: {JSON.stringify($selectedCommunes)}<br />
typeof $selectedCommunes: {typeof $selectedCommunes}<br />
$selectedCommunesChoices: {JSON.stringify($selectedCommunesChoices)}
-->
<div class="text-surface-700 svelte-select max-h-12">
	{#if !communeOf}
		<Select loading={true} placeholder={m.ADDRESSBOOK_COMMUNES_PLACEHOLDER()} />
	{:else}
		<Select
			{label}
			{itemId}
			items={getItems(communeOf)}
			searchable={true}
			on:change={handleChange}
			on:clear={handleClear}
			placeholder={m.ADDRESSBOOK_COMMUNES_PLACEHOLDER()}
			{multiple}
			value={selectionFromUrl}
		><NoOptions slot="empty" /></Select>
	{/if}
</div>

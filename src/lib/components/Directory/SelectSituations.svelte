<script lang="ts">
	import Select from 'svelte-select';
	import NoOptions from '$lib/Web/NoOptions.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { getSelectSituation } from './context';
	import * as m from '$msgs';
	import type { Situation } from '$lib/store/directoryStoreInterface.ts';
	import type { SelectType } from '$lib/interfaces/select';

	const label = 'label';
	const itemId = 'value';

	let selectSituation = getSelectSituation();

	type SituationItem = { value: string; label: string };

	const situations = $derived.by(() => {
		const unsortedSituations: Situation[] = page.data.situations;
		let situationItems: SituationItem[] = unsortedSituations
			.sort(function (a, b) {
				return a.name.localeCompare(b.name);
			})
			.map(function (e) {
				return { value: e.uid, label: e.name };
			});
		return situationItems;
	});

	const selectionFromUrl: SelectType | null = $derived.by(() => {
		const situationUid = page.url.searchParams.get('situation');
		if (!situationUid) return null;
		const _situation = page.data.situations.find((e: Situation) => e.uid == situationUid);
		if (!_situation) return null;
		return { label: _situation.name, value: _situation.uid };
	});

	$effect(() => {
		selectSituation.set(selectionFromUrl);
	});

	function handleChange(event: CustomEvent) {
		if (event.detail) {
			const url = new URL(page.url);
			url.searchParams.set('situation', event.detail.value);
			goto(`${url.pathname}?${url.searchParams}`, { noScroll: true, keepFocus: true });
		}
	}

	function handleClear(event: CustomEvent) {
		if (event.detail) {
			const url = new URL(page.url);
			url.searchParams.delete('situation');
			const newUrl = url.searchParams.toString() ? `${url.pathname}?${url.searchParams}` : url.pathname;
			goto(newUrl, { noScroll: true, keepFocus: true });
		}
	}
</script>

<div class="text-surface-700 svelte-select">
	{#if !situations || !situations.length}
		<Select loading={true} placeholder={m.ADDRESSBOOK_SITUATIONS_PLACEHOLDER()} />
	{:else}
		<Select
			{label}
			{itemId}
			items={situations}
			searchable={true}
			on:change={handleChange}
			on:clear={handleClear}
			placeholder={m.ADDRESSBOOK_SITUATIONS_PLACEHOLDER()}
			value={selectionFromUrl}
		><NoOptions slot="empty" /></Select>
	{/if}
</div>

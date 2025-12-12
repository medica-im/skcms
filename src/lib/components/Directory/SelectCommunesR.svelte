<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import Select from 'svelte-select';
	import { onMount } from 'svelte';
	import * as m from '$msgs';
	import { getSelectedCommunesUids, getSelectedCommunesChoices } from './context';
	import type { Commune } from '$lib/interfaces/geography.interface.ts';
	import type { SelectType } from '$lib/interfaces/select';

	let { communeOf }: { communeOf: Commune[] } = $props();

	let multiple: boolean = $state(false);
	const label = 'label';
	const itemId = 'value';

	let communesParam: string | null = null;

	let selectedCommunes = getSelectedCommunesUids();
	let selectedCommunesChoices = getSelectedCommunesChoices();
	let value: SelectType | SelectType[] | undefined = $derived.by(() => {
		if (multiple) {
			return $selectedCommunesChoices || undefined;
		} else {
			return $selectedCommunesChoices ? $selectedCommunesChoices[0] : undefined;
		}
	});

	onMount(async () => {
		communesParam = page.url.searchParams.get('communes');
		if (!communesParam) return;
		const communeUids: string[] = JSON.parse(communesParam);
		selectedCommunes.set(communeUids);
		$selectedCommunesChoices = getChoices(communeUids, communeOf);
	});

	function getItems(communes: Commune[]) {
		return communes.map(function (x) {
			let dct = { value: x.uid, label: x.name };
			return dct;
		});
	}

	function getChoices(communeUids: string[], allCommunes: Commune[]) {
		const choices = allCommunes
			.filter((x) => communeUids.includes(x.uid))
			.map(function (x) {
				let dct = { value: x.uid, label: x.name };
				return dct;
			});
		return choices;
	}

	function handleClear(event: CustomEvent) {
		if (event.detail) {
			$selectedCommunes = [];
			$selectedCommunesChoices = null;
			if (page.url.searchParams.get('communes')) {
				page.url.searchParams.delete('communes');
				goto(page.url.pathname + '?' + page.url.searchParams);
			}
		}
	}

	function handleChange(event: CustomEvent) {
		if (event.detail) {
			if (Array.isArray(event.detail)) {
				$selectedCommunesChoices = event.detail;
				$selectedCommunes = event.detail.map((e) => e.value);
			} else {
				$selectedCommunesChoices = [event.detail];
				$selectedCommunes = [event.detail.value];
			}
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
<div class="text-surface-700 theme max-h-12">

		<Select
			{label}
			{itemId}
			items={getItems(communeOf)}
			searchable={true}
			on:change={handleChange}
			on:clear={handleClear}
			placeholder={m.ADDRESSBOOK_COMMUNES_PLACEHOLDER()}
			{multiple}
			bind:value
		/>
</div>

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

<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import Select from 'svelte-select';
	import { onMount } from 'svelte';
	import * as m from '$msgs';
	import { getSelectedCommunesUids, getSelectedCommunesChoices } from './context';
	import type { Commune } from '$lib/interfaces/geography.interface.ts';
	import type { SelectType } from '$lib/interfaces/select';
	import type { Loadable } from '@square/svelte-store';

	let { communeOf }: { communeOf: Loadable<Commune[]> } = $props();

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
		const allCommunes = await communeOf.load();
		$selectedCommunesChoices = getChoices(communeUids, allCommunes);
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
<!--{JSON.stringify($communeOf)}
$selectedCommunes: {JSON.stringify($selectedCommunes)}<br />
typeof $selectedCommunes: {typeof $selectedCommunes}<br />
$selectedCommunesChoices: {JSON.stringify($selectedCommunesChoices)}-->
{#await communeOf.load()}
	<div class="text-surface-700 theme">
		<Select loading={true} placeholder={m.ADDRESSBOOK_COMMUNES_PLACEHOLDER()} />
	</div>
{:then}
	<div class="text-surface-700 theme">
		<Select
			{label}
			{itemId}
			items={getItems($communeOf)}
			searchable={true}
			on:change={handleChange}
			on:clear={handleClear}
			placeholder={m.ADDRESSBOOK_COMMUNES_PLACEHOLDER()}
			{multiple}
			bind:value
		/>
	</div>
{:catch error}
	{error}
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

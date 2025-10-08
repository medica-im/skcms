<script lang="ts">
	import { page } from '$app/state';
	import Select from 'svelte-select';
	import { onMount } from 'svelte';
	import { communes } from '$lib/store/directoryStore';
	import * as m from '$msgs';
	import { getSelectCommunes, getSelectCommunesValue } from './context';
	import type { Commune } from '$lib/interfaces/geography.interface.ts';
	import type { SelectType } from '$lib/interfaces/select';
	export let communeOf;

	const label = 'label';
	const itemId = 'value';

	let communesParam: string | null = null;

	let selectCommunes = getSelectCommunes();
	let selectCommunesValue = getSelectCommunesValue();

	onMount(async () => {
		communesParam = page.url.searchParams.get('communes');
		if (!communesParam) return;
		const communeUids: string[] = JSON.parse(communesParam);
		selectCommunes.set(communeUids);
		let allCommunes = await communes();
		const communesVal = getValue(communeUids, allCommunes);
		if (communesVal) selectCommunesValue.set(communesVal);
	});

	function getItems(communes: Commune[]) {
		return communes.map(function (x) {
			let dct = { value: x.uid, label: x.name };
			return dct;
		});
	}

	function getValue(communeUids: string[], allCommunes: Commune[]) {
		if (allCommunes) {
			let val = allCommunes
				.filter((x) => communeUids.includes(x.uid))
				.map(function (x) {
					let dct = { value: x.uid, label: x.name };
					return dct;
				});
			return val;
		}
	}

	function handleClear(event: CustomEvent) {
		if (event.detail) {
			selectCommunes.set([]);
		}
	}

	function handleChange(event: CustomEvent) {
		if (event.detail) {
			const communeUids = event.detail.map((e: SelectType) => e.value);
			$selectCommunes = communeUids;
		}
	}
</script>

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
			searchable={false}
			on:change={handleChange}
			on:clear={handleClear}
			placeholder={m.ADDRESSBOOK_COMMUNES_PLACEHOLDER()}
			multiple={true}
			bind:value={$selectCommunesValue}
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

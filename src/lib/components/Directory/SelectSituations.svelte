<script lang="ts">
	import Select from 'svelte-select';
	import { onMount } from 'svelte';
	import { getSelectSituation } from './context';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import * as m from '$msgs';
	import type { Situation } from '$lib/store/directoryStoreInterface.ts';

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
				const situation = {
					value: e.uid,
					label: e.name
				};
				return situation;
			});
		return situationItems;
	});

	function getSituationSelect(uid: string | null) {
		const _situation = page.data.situations.find((e) => e.value == uid);
		return _situation;
	}

	onMount(() => {
		const situationUid = page.url.searchParams.get('situation');
		if (!situationUid) return;
		const situation = getSituationSelect(situationUid);
		if (situation) {
			selectSituation.set(situation);
		}
	});

	function handleClear(event: CustomEvent) {
		if (event.detail) {
			if (page.url.searchParams.get('situation')) {
				page.url.searchParams.delete('situation');
				goto(page.url.pathname + '?' + page.url.searchParams);
			}
		}
	}
</script>

<div class="text-surface-700 theme">
	{#if !situations && !situations.length}
		<Select loading={true} placeholder={m.ADDRESSBOOK_SITUATIONS_PLACEHOLDER()} />
	{:else}
		<Select
			{label}
			{itemId}
			items={situations}
			searchable={true}
			on:clear={handleClear}
			placeholder={m.ADDRESSBOOK_SITUATIONS_PLACEHOLDER()}
			bind:value={$selectSituation}
		/>
	{/if}
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

<script lang="ts">
	import Select from 'svelte-select';
	import { onMount } from 'svelte';
	import { getSelectSituation, getSelectSituationValue } from './context';
	import { situations } from '$lib/store/directoryStore';
	import type { SelectType } from '$lib/interfaces/select';
	import * as m from '$msgs';
	const label = 'label';
	const itemId = 'value';

	let selectSituation = getSelectSituation();

	let selected: SelectType | undefined = $state();

	onMount(async () => {});

	function handleClear(event: CustomEvent) {
		if (event.detail) {
			selectSituation.set(null);
		}
	}

	function handleChange(event: CustomEvent) {
		//console.log(event);
		if (event.detail) {
			//console.log(event.detail);
			//console.log(event.detail.value);
			selectSituation.set(event.detail.value);
		}
	}
</script>

<!--
$selectSituation: {$selectSituation}<br>
value: {JSON.stringify(value)}
-->
{#await situations()}
	<div class="text-surface-700 theme">
		<Select loading={true} placeholder={m.ADDRESSBOOK_SITUATIONS_PLACEHOLDER()} />
	</div>
{:then situations}
	<div class="text-surface-700 theme">
		<Select
			{label}
			{itemId}
			items={situations}
			searchable={false}
			on:change={handleChange}
			on:clear={handleClear}
			placeholder={m.ADDRESSBOOK_SITUATIONS_PLACEHOLDER()}
			bind:value={selected}
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

<script lang="ts">
	import { onMount } from 'svelte';
	import * as m from '$msgs';
	import Select from 'svelte-select';
	import { getEffectorTypes } from './data';
	import { getTypeItems } from '$lib/components/Directory/SelectCategory.ts';
	import type { EffectorType } from '$lib/interfaces/v2/effector';

	let {
		selectedEffectorType = $bindable(),
	}: { selectedEffectorType: { label: string; value: string } | undefined; } = $props();

	let effectorTypes: EffectorType[]|undefined = $state();
	let filterText: string = $state('');
	const itemFilter = () => true; // turn off internal filter
	onMount(async ()=> {
		effectorTypes = await getEffectorTypes();
	}
	)
</script>

{#if effectorTypes}
	<div class="themed w-full">
		<Select
			{itemFilter}
			searchable={true}
			items={getTypeItems(effectorTypes, filterText)}
			bind:value={selectedEffectorType}
			bind:filterText
			placeholder="Sélectionner une catégorie"
		/>
	</div>
{:else}
	<div class="themed w-full">
		<Select loading={true} placeholder="Sélectionner une catégorie" />
	</div>
{/if}

<style>
	.themed {
		--border-radius: var(--theme-rounded-container);
		--border-color: rgb(var(--color-primary-500));
		--border: 2px solid rgb(var(--color-primary-500));
		--border-focused: 2px solid rgb(var(--color-primary-700));
		--border-hover: 2px solid rgb(var(--color-primary-600));
		--item-active-outline: 1px solid rgb(var(--color-primary-500));
		--item-outline: 1px solid rgb(var(--color-primary-500));
		--clear-select-focus-outline: 1px solid rgb(var(--color-primary-500));
		--height: 3rem;
		--placeholder-color: rgb(var(--color-primary-700));
		animation: subtle-glow 2s ease-in-out 3;
	}
	@keyframes subtle-glow {
		0%, 100% { box-shadow: 0 0 0 0 transparent; }
		50% { box-shadow: 0 0 0 3px rgba(var(--color-primary-500) / 0.25); border-radius: var(--theme-rounded-container); }
	}
</style>

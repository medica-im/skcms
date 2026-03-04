<script lang="ts">
	import { onMount } from 'svelte';
	import * as m from '$msgs';
	import Select from 'svelte-select';
	import NoOptions from '$lib/Web/NoOptions.svelte';
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
	<div class="svelte-select svelte-select-glow w-full">
		<Select
			{itemFilter}
			searchable={true}
			items={getTypeItems(effectorTypes, filterText)}
			bind:value={selectedEffectorType}
			bind:filterText
			placeholder="Sélectionner une catégorie"
		><NoOptions slot="empty" /></Select>
	</div>
{:else}
	<div class="svelte-select svelte-select-glow w-full">
		<Select loading={true} placeholder="Sélectionner une catégorie" />
	</div>
{/if}

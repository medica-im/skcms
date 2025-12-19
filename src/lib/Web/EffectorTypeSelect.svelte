<script lang="ts">
	import * as m from '$msgs';
	import Select from 'svelte-select';
	import { createQuery } from '@tanstack/svelte-query';
	import { getEffectorTypes } from './data';
	import { getTypeItems } from '$lib/components/Directory/SelectCategory.ts';
	import type { EffectorType } from '$lib/interfaces/v2/effector';

	let {
		selectedEffectorType = $bindable(),
	}: { selectedEffectorType: { label: string; value: string } | undefined; } = $props();

	let filterText: string = $state('');

	const types = createQuery<EffectorType[], Error>({
		queryKey: ['effector-types'],
		queryFn: () => getEffectorTypes()
	});
	const itemFilter = () => true; // turn off internal filter
</script>

{#if $types.status === 'pending'}
	<span>{m.LOADING}</span>
{:else if $types.status === 'error'}
	<span>{m.ERROR}: {$types.error.message}</span>
{:else}
	<Select
		{itemFilter}
		searchable={true}
		items={getTypeItems($types.data, filterText)}
		bind:value={selectedEffectorType}
    	bind:filterText
		placeholder="Sélectionner une catégorie"
	/>
{/if}

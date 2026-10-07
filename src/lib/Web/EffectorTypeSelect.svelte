<script lang="ts">
	import * as m from '$msgs';
	import Select from '$lib/Web/Select.svelte';
	import NoOptions from '$lib/Web/NoOptions.svelte';
	import { getEffectorTypes } from './data';
	import { getTypeItems } from '$lib/components/Directory/SelectCategory.ts';
	import type { EffectorType } from '$lib/interfaces/v2/effector';

	let {
		selectedEffectorType = $bindable(),
		scope = 'all',
		exclude = []
	}: {
		selectedEffectorType: { label: string; value: string } | undefined;
		/** 'directory': only what this site's directory offers at entry creation. */
		scope?: 'all' | 'directory';
		/** Uids left out, e.g. the categories a directory already offers. */
		exclude?: string[];
	} = $props();

	let effectorTypes: EffectorType[] | undefined = $state();
	let filterText: string = $state('');
	const itemFilter = () => true; // turn off internal filter

	// Reloaded when the scope changes: a superuser may switch to every category.
	$effect(() => {
		const wanted = scope;
		effectorTypes = undefined;
		getEffectorTypes(wanted).then((types) => {
			if (wanted === scope) effectorTypes = types;
		});
	});

	const offered = $derived(effectorTypes?.filter((t) => !exclude.includes(t.uid)));
</script>

{#if offered}
	<div class="svelte-select svelte-select-glow w-full">
		<Select
			{itemFilter}
			searchable={true}
			items={getTypeItems(offered, filterText)}
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

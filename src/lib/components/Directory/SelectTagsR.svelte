<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import Select from 'svelte-select';
	import { onMount } from 'svelte';
	import * as m from '$msgs';
	import { getSelectedTags } from './context';
	import { arrayFilterUnique } from '$lib/utils/utils.ts';
	import type { Tag } from '$lib/store/directoryStoreInterface';
	import type { SelectType } from '$lib/interfaces/select';
	import type { Entry } from '$lib/store/directoryStoreInterface';

	let { tagOf }: { tagOf: Tag[] } = $props();

	let items = $derived.by(() => {
		return tagOf.map((t) => {
				return { label: t.labelShort, value: t.uid };
			});
	});
	let selectedTags = getSelectedTags();
	let value: SelectType | SelectType[] | undefined = $derived.by(() => {
		if ($selectedTags === null) {
			return undefined;
		} else {
			const _value = getValue($selectedTags);
			if (!_value) return;
			if (multiple) {
				return _value;
			} else {
				return _value[0];
			}
		}
	});
	let multiple: boolean = $state(false);
	const label = 'label';
	const itemId = 'value';

	function getValue(tags: Tag[]) {
		return tags.map((t) => {
				return { label: t.labelShort, value: t.uid };
			});
	}

	onMount(() => {
		const tagsParam = page.url.searchParams.get('tags');
		console.log('tags', tagsParam);
		if (!tagsParam) return;
		const tagUids: string[] = JSON.parse(tagsParam);
		const tags = page.data.entries.map((e: Entry) => e.tags).flat().filter(arrayFilterUnique((t: Tag)=>t.uid)).filter((t: Tag)=>{return tagUids.includes(t.uid)});
		selectedTags.set(tags);
	});

	function handleClear(event: CustomEvent) {
		if (event.detail) {
			$selectedTags = null;
			if (page.url.searchParams.get('tags')) {
				page.url.searchParams.delete('tags');
				goto(page.url.pathname + '?' + page.url.searchParams);
			}
		}
	}

	function handleChange(event: CustomEvent) {
		if (event.detail) {
			console.log(event.detail);
			if (Array.isArray(event.detail)) {
				//$selectedCommunesChoices = event.detail;
				$selectedTags = event.detail.map((e) => e.value);
			} else {
				console.log(event.detail.value);
				//$selectedCommunesChoices = [event.detail];
				const tag = page.data.entries.map((e: Entry) => e.tags).flat().find((t: Tag)=>t.uid=event.detail.value);
				selectedTags.set([tag]);
				console.log($selectedTags);
			}
		}
	}
</script>
<!--
{JSON.stringify($selectedTags)}
-->
<div class="text-surface-700 theme max-h-12">
	{#if !tagOf}
		<Select loading={true} placeholder={"Sélectionner une étiquette"} />
	{:else}
		<Select
			{label}
			{itemId}
			{items}
			searchable={true}
			on:change={handleChange}
			on:clear={handleClear}
			placeholder={"Sélectionner une étiquette"}
			bind:value
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

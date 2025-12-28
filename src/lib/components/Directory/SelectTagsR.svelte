<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import Select from 'svelte-select';
	import { onMount } from 'svelte';
	import * as m from '$msgs';
	import { getSelectedTags, getSelectCategories } from './context';
	import { arrayFilterUnique } from '$lib/utils/utils.ts';
	import type { Tag, TagCategory } from '$lib/store/directoryStoreInterface';
	import type { SelectType } from '$lib/interfaces/select';
	import type { Entry } from '$lib/store/directoryStoreInterface';

	let { tagOf }: { tagOf: Tag[] } = $props();

	const selectCategories = getSelectCategories();
	const activeTagCategories = (): TagCategory[] => {
		const aTC: TagCategory[] = [];
		page.data.entries
			.filter((e: Entry) => $selectCategories.includes(e.effector_type.uid))
			.forEach((e: Entry) => {
				if (e.tags) {
					const tags = e.tags.filter((t) => t.effector_types.includes(e.effector_type.uid));
					tags.forEach((t) => aTC.push(t.category));
				}
			});
		const uniqueActiveTagCategories = aTC.filter(arrayFilterUnique((t: TagCategory) => t.uid));
		console.log(uniqueActiveTagCategories);
		return uniqueActiveTagCategories;
	};
	const getItems = (category: TagCategory) => {
		const items = tagOf
			.filter((t) => {return t.category.name == category.name})
			.map((t) => {
				return { label: t.labelShort, value: t.uid };
			});

		return items;
	};
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
		const tags = page.data.entries
			.map((e: Entry) => e.tags)
			.flat()
			.filter(arrayFilterUnique((t: Tag) => t.uid))
			.filter((t: Tag) => {
				return tagUids.includes(t.uid);
			});
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
			if (Array.isArray(event.detail)) {
				$selectedTags = event.detail.map((e) => e.value);
			} else {
				const tag = page.data.entries
					.map((e: Entry) => e.tags)
					.flat()
					.find((t: Tag) => {return t.uid == event.detail.value});
				selectedTags.set([tag]);
			}
		}
	}
</script>

<!--{JSON.stringify($selectedTags)}-->
{#each activeTagCategories() as aTC}
	<div class="text-surface-700 theme max-h-12">
		{#if !tagOf}
			<Select loading={true} placeholder={aTC.labelShort} />
		{:else}
			<Select
				{label}
				{itemId}
				items={getItems(aTC)}
				searchable={true}
				on:change={handleChange}
				on:clear={handleClear}
				placeholder={aTC.labelShort}
				bind:value
			/>
		{/if}
	</div>
{/each}

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

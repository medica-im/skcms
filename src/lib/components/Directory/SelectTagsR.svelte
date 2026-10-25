<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import Select from '$lib/Web/Select.svelte';
	import { onMount } from 'svelte';
	import * as m from '$msgs';
	import { getSelectedTags, getSelectCategories } from './context';
	import { arrayFilterUnique } from '$lib/utils/utils.ts';
	import type { Tag, TagCategory, Type } from '$lib/store/directoryStoreInterface';
	import { tagCategoriesShownF } from '$lib/store/directoryStore';
	import type { SelectType } from '$lib/interfaces/select';
	import type { Entry } from '$lib/store/directoryStoreInterface';

	let { tagOf, categoryOf }: { tagOf: Tag[]; categoryOf: Type[] } = $props();

	const selectCategories = getSelectCategories();
	const shownCategories: TagCategory[] = $derived(tagCategoriesShownF(tagOf, $selectCategories, categoryOf));
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

	function handleClear(cleared: unknown) {
		if (cleared) {
			$selectedTags = null;
			if (page.url.searchParams.get('tags')) {
				page.url.searchParams.delete('tags');
				goto(page.url.pathname + '?' + page.url.searchParams);
			}
		}
	}

	function handleChange(selected: SelectType | SelectType[] | undefined) {
		if (selected) {
			const uids = Array.isArray(selected) ? selected.map((e) => e.value) : [selected.value];
			const tags: Tag[] = page.data.entries
				.flatMap((e: Entry) => e.tags ?? [])
				.filter(arrayFilterUnique((t: Tag) => t.uid))
				.filter((t: Tag) => uids.includes(t.uid));
			selectedTags.set(tags);
		}
	}
</script>

<!--{JSON.stringify($selectedTags)}-->
{#each shownCategories as aTC}
	<div class="text-surface-700 svelte-select max-h-12">
		{#if !tagOf}
			<Select loading={true} placeholder={aTC.labelShort} />
		{:else}
			<Select
				{label}
				{itemId}
				items={getItems(aTC)}
				searchable={true}
				onchange={handleChange}
				onclear={handleClear}
				placeholder={aTC.labelShort}
				{value}
			/>
		{/if}
	</div>
{/each}

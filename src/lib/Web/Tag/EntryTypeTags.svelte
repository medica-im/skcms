<script lang="ts">
	import * as m from '$msgs';
	import Fa from 'svelte-fa';
	import { faCheck, faPenToSquare, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
	import { getTagCategories, getTags } from '../../../tag.remote.ts';
	import TagSelect from './TagSelect.svelte';
	import { tagGroupsForType, type ApiTag } from './tagsForType.ts';
	import type { TagCategory } from '#lib/store/directoryStoreInterface.ts';
	import type { SelectType } from '#lib/interfaces/select.ts';

	let {
		effectorType,
		tags = $bindable([]),
		decided = $bindable(false)
	}: {
		/** The uid of the effector type chosen for the entry. */
		effectorType: string;
		tags?: SelectType[];
		/** True once the tags are confirmed or skipped, or when the type has none to offer. */
		decided?: boolean;
	} = $props();

	/** undefined while loading, null when it failed. */
	let loaded: { categories: TagCategory[]; tags: ApiTag[] } | null | undefined = $state();

	Promise.all([getTagCategories(), getTags()]).then(
		([categories, all]) => {
			loaded = categories && all ? { categories, tags: all as unknown as ApiTag[] } : null;
		},
		(error) => {
			console.error('failed to load tags for the effector type', effectorType, error);
			loaded = null;
		}
	);

	const groups = $derived(loaded ? tagGroupsForType(loaded.categories, loaded.tags, effectorType) : []);
	let chosen: Record<string, SelectType[] | undefined> = $state({});
	const picked = $derived(Object.values(chosen).flatMap((selected) => selected ?? []));

	$effect(() => {
		if (loaded && groups.length === 0) decided = true;
	});

	const choices = (group: (typeof groups)[number]): SelectType[] =>
		group.tags.map((t) => ({ value: t.uid, label: t.labelShort || t.label }));
</script>

{#if loaded === null}
	<div class="card variant-ringed p-4 w-full space-y-4">
		<aside class="alert variant-filled-error">
			<span class="badge-icon"><Fa icon={faExclamationTriangle} /></span>
			<p class="alert-message">{m.TAGS_UNAVAILABLE()}</p>
		</aside>
		{#if !decided}
			<button
				type="button"
				class="btn min-h-11 variant-ghost-surface"
				onclick={() => {
					tags = [];
					decided = true;
				}}>{m.TAGS_AT_CREATION_SKIP()}</button
			>
		{/if}
	</div>
{:else if groups.length}
	<div class="card variant-ringed p-4 w-full space-y-4">
		<h3 class="h3">{m.TAGS_AT_CREATION_TITLE()}</h3>
		{#if decided}
			<div class="flex flex-wrap items-center gap-2">
				<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
				{#each tags as tag (tag.value)}
					<span class="badge variant-soft-primary text-base">{tag.label}</span>
				{:else}
					<span class="text-base">{m.TAGS_AT_CREATION_NONE()}</span>
				{/each}
			</div>
			<button type="button" class="btn min-h-11 variant-ghost-surface" onclick={() => (decided = false)}>
				<span><Fa icon={faPenToSquare} /></span>
				<span>{m.EDIT()}</span>
			</button>
		{:else}
			<p>{m.TAGS_AT_CREATION_HELP()}</p>
			{#each groups as group (group.category.uid)}
				<TagSelect
					label={group.category.label}
					items={choices(group)}
					bind:value={chosen[group.category.uid]}
				/>
			{/each}
			<div class="flex flex-wrap gap-4 justify-end">
				<button
					type="button"
					class="btn min-h-11 variant-ghost-surface"
					onclick={() => {
						chosen = {};
						tags = [];
						decided = true;
					}}>{m.TAGS_AT_CREATION_SKIP()}</button
				>
				<button
					type="button"
					class="btn min-h-11 variant-filled-primary"
					disabled={picked.length === 0}
					onclick={() => {
						tags = picked;
						decided = true;
					}}
				>
					<span><Fa icon={faCheck} /></span>
					<span>{m.TAGS_AT_CREATION_CONFIRM()}</span>
				</button>
			</div>
		{/if}
	</div>
{/if}

<script lang="ts">
	import { PUBLIC_ORIGIN as ORIGIN } from '$env/static/public';
	import * as m from '$msgs';
	import { postEntryTag, getTagCategories } from '../../../tag.remote.ts';
	import { invalidate } from '$app/navigation';
	import {
		faInfo,
		faPlus,
		faPenToSquare,
		faCheck,
		faExclamationCircle
	} from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import { JsonView } from '@zerodevx/svelte-json-view';
	import Select from 'svelte-select';
	import Dialog from '../Dialog.svelte';
	import { getEntryUid } from '$lib/components/Directory/context';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import { Accordion, AccordionItem } from '@skeletonlabs/skeleton';
	import type { Tag } from '$lib/store/directoryStoreInterface.ts';
	import type { FormResult } from '$lib/interfaces/v2/form';
	import type { SelectType } from '$lib/interfaces/select.ts';

	let { tags }: { tags: Tag[] | null } = $props();

	const uid = getEntryUid();

	let categoryChoices: SelectType[]|undefined = $state();

	const getCategoryChoices = async () => {
		const tagCategories = await getTagCategories();
		if (tagCategories) {
			return tagCategories.map((e) => {
				return { value: e.name, label: e.label };
			});
		}
	};
	let tagChoices: SelectType[] | undefined = $state();
	let dialog: HTMLDialogElement | undefined = $state();
	let result: FormResult | undefined = $state();
	let selectedCategory: SelectType | undefined = $state();
	let selectedTags: SelectType[] | undefined = $state();
	let addTags: string[] | null = $state(null);
	let removeTags: string[] | null = $state(null);
	let commandData = $derived({
		entry: uid,
		addTags: addTags,
		removeTags: removeTags
	});
	let disabled: boolean = $derived(!addTags && !removeTags);

	const clear = () => {
		addTags = null;
		removeTags = null;
		selectedTags = undefined;
		selectedCategory = undefined;
	};

	const initialize = () => {
		selectedTags = undefined;
		if (selectedCategory && tags) {
			selectedTags = tags
				.filter((t) => {
					return t.category.name === selectedCategory?.value;
				})
				.map((t) => {
					return { value: t.uid, label: t.labelShort };
				});
		}
	};
	async function onTagChange(event: CustomEvent) {
		if (event.detail) {
			const currentTags = tags ? tags.map((t) => t.uid) : null;
			const eventTags: SelectType[] = event.detail;
			if (!addTags) {
				addTags = [];
			}
			const eventUids = eventTags.map((t) => t.value);
			eventUids.forEach((item) => {
				if (!addTags?.includes(item) && !currentTags?.includes(item)) {
					addTags?.push(item);
				}
			});
		}
	}
	async function onTagClear(event: CustomEvent) {
		if (event.detail) {
			const forDeletion: string[] = Array.isArray(event.detail)
				? event.detail.map((e) => e.value)
				: [event.detail.value];
			const existingTags: string[] = tags ? tags.map((t) => t.uid) : [];
			if (addTags) {
				addTags = addTags.filter((item) => !forDeletion.includes(item));
			}
			if (existingTags) {
				forDeletion.forEach((tag) => {
					if (existingTags.includes(tag)) {
						if (!removeTags) {
							removeTags = [];
						}
						if (!removeTags.includes(tag)) {
							removeTags.push(tag);
						}
					}
				});
			}
			if (addTags?.length == 0) {
				addTags = null;
			}
			if (removeTags?.length == 0) {
				removeTags = null;
			}
		}
	}
	async function onCategoryClear(event: CustomEvent) {
		if (event.detail) {
			selectedTags = undefined;
			tagChoices = undefined;
		}
	}
	async function onCategoryChange(event: CustomEvent) {
		if (event.detail) {
			const url = `${ORIGIN}/api/v2/tags?category=${event.detail.value}`;
			const response = await fetch(url);
			if (!response.ok) {
				console.error(response.status);
				return;
			}
			const tags: Tag[] = await response.json();
			tagChoices = tags.map((t) => {
				return { value: t.uid, label: t.labelShort };
			});
			initialize();
		}
	}
</script>

<button
	onclick={async () => {
		result = undefined;
		categoryChoices = await getCategoryChoices();
		dialog?.showModal();
	}}
	class="btn btn-sm variant-ghost-surface"
	title={tags ? 'Modifier' : 'Ajouter'}
>
	<span>{tags ? 'Modifier les étiquettes' : 'Ajouter une étiquette'}</span>
	<span><Fa icon={tags ? faPenToSquare : faPlus} /></span>
</button>

<Dialog bind:dialog>
	<div class="rounded-lg h-min-96 w-96 p-4 variant-ghost-secondary items-center place-items-center">
		{#if import.meta.env.DEV}
			<Accordion>
				<AccordionItem>
					<svelte:fragment slot="lead"><Fa icon={faInfo} /></svelte:fragment>
					<svelte:fragment slot="summary">tags</svelte:fragment>
					<svelte:fragment slot="content"
						><div class="p-2 text-lg text-gray-700">
							<JsonView json={tags} />
						</div></svelte:fragment
					>
				</AccordionItem>
				<AccordionItem>
					<svelte:fragment slot="lead"><Fa icon={faInfo} /></svelte:fragment>
					<svelte:fragment slot="summary">commandData</svelte:fragment>
					<svelte:fragment slot="content"
						><div class="p-2 text-lg text-gray-700 wrap">
							<JsonView json={commandData} />
						</div></svelte:fragment
					>
				</AccordionItem>
			</Accordion>
		{/if}
		<div class="grid grid-cols-1 gap-6 w-full">
			<h3 class="h3">{capitalizeFirstLetter(m.tag({ count: 2 }))}</h3>
			<label class="label">
				<span>{capitalizeFirstLetter(m.category({ count: 1 }))}</span>
				<Select
					items={categoryChoices}
					bind:value={selectedCategory}
					on:change={onCategoryChange}
					on:clear={onCategoryClear}
				/>
			</label>
			<label class="label">
				<span>{capitalizeFirstLetter(m.tag({ count: tagChoices?.length || 1 }))}</span>
				<Select
					multiple
					items={tagChoices}
					bind:value={selectedTags}
					on:change={onTagChange}
					on:clear={onTagClear}
				/>
			</label>

			<div class="flex w-full items-center">
				<div class="w-1/3">
					{#if result?.success}
						<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
					{:else if result && !result?.success}
						<span class="badge-icon variant-filled-error"><Fa icon={faExclamationCircle} /></span
						>{result.text}
					{/if}
				</div>
				<div class="w-2/3">
					<div class="flex gap-2">
						<button
							onclick={async () => {
								try {
									result = await postEntryTag(commandData);
									if (result?.success) {
										disabled = true;
										invalidate('entry:now');
									}
								} catch (error) {
									console.error(error);
								}
							}}
							type="submit"
							class="variant-filled-secondary btn w-min"
							{disabled}>Envoyer</button
						>
						<button
							type="button"
							class="variant-filled-error btn w-min"
							onclick={() => {
								clear();
								dialog?.close();
							}}
							>{#if result?.success || disabled}Fermer{:else}Annuler{/if}</button
						>
					</div>
				</div>
			</div>
		</div>
	</div>
</Dialog>

<style>
	.wrap {
		font-family: monospace;
		font-size: 14px;
		--jsonBorderLeft: 2px dashed red;
		--jsonValColor: blue;
	}
</style>

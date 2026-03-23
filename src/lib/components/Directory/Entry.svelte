<script lang="ts">
	import Phones from '$lib/Directory/Phone/Phones.svelte';
	import { FacilityLink } from '$lib';
	import Avatar from '$lib/components/Effector/Avatar/Avatar.svelte';
	import { page } from '$app/state';
	import {
		getSelectFacility,
		getSelectCategories,
		getTerm,
		getSelectedCommunesUids,
		getSelectedDepartment,
		getSelectSituation,
		getSelectedTags,
		getAddressFeature,
		getDisplayMap
	} from './context';
	import { goto } from '$app/navigation';
	import CommunityAddress from '$lib/Address/CommunityAddress.svelte';
	import Tag from '$lib/Tag/Tag.svelte';
	import { entrySlugPageUrl, entryPageUrl } from '$lib/utils/utils';
	import type { Entry } from '$lib/store/directoryStoreInterface';
	import * as m from '$msgs';
	import Fa from 'svelte-fa';
	import { faLink } from '@fortawesome/free-solid-svg-icons';
	let { entry, displayAvatar }: { entry: Entry; displayAvatar: boolean } = $props();

	let addressFeature = getAddressFeature();
	let selectSituation = getSelectSituation();
	let selectFacility = getSelectFacility();
	let selectCategories = getSelectCategories();
	let selectCommunes = getSelectedCommunesUids();
	let selectDepartment = getSelectedDepartment();
	let tags = getSelectedTags();
	let term = getTerm();
	let displayMap = getDisplayMap();
	const avatar = $derived(entry.avatar);

	const oldUrl = $derived(entryPageUrl(
		entry,
		page.data.organization?.category?.name,
		page.url.pathname,
		$selectFacility,
		$selectCategories,
		$tags?.map((t) => t.uid),
		$term,
		$selectCommunes,
		$selectDepartment,
		$selectSituation?.value,
		$addressFeature,
		$displayMap
	));

	const goToOld = () => {
		goto(oldUrl, { replaceState: false });
	};

	const goTo = () => {
		const url = entrySlugPageUrl(
			entry,
			page.url.pathname,
			$selectFacility,
			$selectCategories,
			$tags?.map((t) => t.uid),
			$term,
			$selectCommunes,
			$selectDepartment,
			$selectSituation?.value,
			$addressFeature,
			$displayMap
		);
		console.log("goTo() url", url);
		goto(url, { replaceState: false });
	};
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div
	onclick={() => {
		goTo();
	}}
	style="all: unset; cursor: pointer;"
>
	<div
		class="flex flex-col items-top rounded lg:rounded-lg lg:flex-row variant-soft-surface m-4 w-full"
	>
		{#if displayAvatar == true}
			<div class="p-4 lg:p-0">
				<Avatar {avatar} name={entry.name} size="sm" />
			</div>
		{/if}
		<div class="p-4 space-y-1 flex-1">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<h3 class="h3">{entry.name}</h3>
					{#if import.meta.env.DEV}
						<button
							type="button"
							class="btn btn-sm variant-ghost-surface p-1"
							title={oldUrl}
							onclick={(e: MouseEvent) => { e.stopPropagation(); goToOld(); }}
						>
							<Fa icon={faLink} size="xs" />
						</button>
					{/if}
				</div>
				{#if entry.active === false}
					<span class="badge variant-filled-error badge-sm" title={m.ENTRY_INACTIVE()}
						>{m.INACTIVE()}</span
					>
				{/if}
			</div>
			<!--
			{#if (import.meta.env.VITE_DEV == 'true')}
			<p class="text-xs">{entry.effector_uid}</p>
			{/if}
			-->
			<div class="flex flex-wrap gap-2">
				<h4 class="h4"><i>{entry.effector_type.label}</i></h4>
				<Tag data={entry?.tags} compact={true} />
			</div>

			{#if entry.phones?.length}
				<Phones data={entry.phones} />
			{/if}
			{#if page.data.organization.category.name == 'cpts'}
				<CommunityAddress data={entry.address} />
			{:else}
				<div class="space-y-1">
					{#if entry.facility}
						<div><FacilityLink data={entry.facility} /></div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>

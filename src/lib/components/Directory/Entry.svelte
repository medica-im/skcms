<script lang="ts">
	import Phones from '$lib/Directory/Phone/Phones.svelte';
	import { FacilityLink } from '$lib';
	import AvatarList from '$lib/components/Effector/Avatar/AvatarList.svelte';
	import { page } from '$app/state';
	import { getSelectFacility, getSelectCategories, getTerm, getSelectedCommunesUids, getSelectSituation, getAddressFeature } from './context';
	import { goto } from '$app/navigation';
	import CommunityAddress from '$lib/Address/CommunityAddress.svelte';
	import { entryPageUrl } from '$lib/utils/utils';
	import type { Entry } from '$lib/store/directoryStoreInterface';
	let { entry, avatar }:{ entry: Entry; avatar: boolean;} = $props();

	let addressFeature = getAddressFeature();
	let selectSituation = getSelectSituation();
	let selectFacility = getSelectFacility();
	let selectCategories = getSelectCategories();
	let selectCommunes = getSelectedCommunesUids();
	let term = getTerm();

	const goTo = () => {
		const url = entryPageUrl(
			entry,
			page.data.organization.category.name,
			page.url.pathname,
			$selectFacility,
			$selectCategories,
			$term,
			$selectCommunes,
			$selectSituation?.value,
			$addressFeature,
		);
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
	<div class="flex flex-col items-top rounded lg:rounded-lg lg:flex-row variant-soft-surface m-4 w-full">
		{#if avatar == true}
			<div class="p-4 lg:p-0">
				<AvatarList data={entry} />
			</div>
		{/if}
		<div class="p-4 space-y-1">
			<h3 class="h3">{entry.name}</h3>
			<!--
			{#if (import.meta.env.VITE_DEV == 'true')}
			<p class="text-xs">{entry.effector_uid}</p>
			{/if}
			-->
			<h4 class="h4"><i>{entry.effector_type.label}</i></h4>

			{#if entry.phones?.length}
				<Phones data={entry.phones} />
			{/if}
			{#if page.data.organization.category.name=="cpts"}
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

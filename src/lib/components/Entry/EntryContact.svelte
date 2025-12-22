<script lang="ts">
	import Phones from '$lib/Directory/Phone/Phones.svelte';
	import Emails from '$lib/Email/Emails.svelte';
	import { FacilityLink } from '$lib';
	import AvatarList from '$lib/components/Effector/Avatar/AvatarList.svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { entryPageUrl } from '$lib/utils/utils';
	import type { EntryFull } from '$lib/store/directoryStoreInterface';
	import type { Entry } from '$lib/store/directoryStoreInterface';
	export let entry: EntryFull;
	export let avatar: boolean;

	const goTo = () => {
		const _entry: Entry = page.data.entries.find((e: Entry)=>e.uid==entry.uid);
		const url = entryPageUrl(_entry, page.data.organization.category.name, page.url.pathname);
		goto(url, { replaceState: false });
	};
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<button
	on:click={() => {
		goTo();
	}}
	style="all: unset; cursor: pointer;"
>
	<div class="flex flex-col items-top rounded-lg lg:flex-row variant-soft-surface">
		{#if avatar == true}
		<div class="p-4 lg:p-0">
			<AvatarList data={entry} />
		</div>
		{/if}
		<div class="px-4 py-2 space-y-1">
			<h3 class="h3">{entry.name}</h3>
			<!--
			{#if (import.meta.env.VITE_DEV == 'true')}
			<p class="text-xs">{entry.effector_uid}</p>
			{/if}
			-->
			<h4 class="h4"><i>{entry.effector_type.label}</i></h4>
			<div class="space-y-2">

			{#if entry.phones?.length}
				<Phones data={entry.phones} />
			{/if}
			{#if entry.emails?.length}
				<Emails data={entry.emails} editMode={false} />
			{/if}
				{#if entry.facility}
					<div><FacilityLink data={entry.facility} /></div>
				{/if}
			</div>
		</div>
	</div>
</button>

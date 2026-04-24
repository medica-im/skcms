<script lang="ts">
	import { page } from '$app/state';
	import * as m from '$msgs';
	import Fa from 'svelte-fa';
	import { faPeopleGroup } from '@fortawesome/free-solid-svg-icons';
	import Directory from '$lib/components/Directory/CtxDirectory.svelte';
	import { cardCatEntries } from '$lib/components/Directory/directory';
	import type { Entry } from '$lib/store/directoryStoreInterface';

	let { uid }: { uid: string } = $props();

	const affiliates = $derived.by(() => {
		const entries: Entry[] = (page.data.entries ?? []).filter(
			(e: Entry) => e.memberships?.includes(uid) && e.uid !== uid
		);
		if (!entries.length) return null;
		return cardCatEntries(entries, page.data.labels);
	});
</script>

{#if affiliates}
	<div class="d-flex justify-content-between align-items-start">
		<div class="flex items-center py-2">
			<div class="w-9"><Fa icon={faPeopleGroup} size="sm" /></div>
			<div>
				<h4 class="h4">{m.AFFILIATED_MEMBERS()}</h4>
			</div>
		</div>
		<div class="flex">
			<div class="w-9"></div>
			<div class="py-2">
				<Directory
					data={affiliates}
					typesView={true}
					displayEntries={true}
					propCurrentOrg={null}
				/>
			</div>
		</div>
	</div>
{/if}

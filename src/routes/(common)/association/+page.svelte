<script lang="ts">
	import { page } from '$app/state';
	import * as m from '$msgs';
	import { TabGroup, Tab } from '@skeletonlabs/skeleton';
	import OfficerCard from '$lib/Association/OfficerCard.svelte';
	import BoardMemberCard from '$lib/Association/BoardMemberCard.svelte';
	import type { Entry } from '$lib/store/directoryStoreInterface';

	let { data } = $props();

	let tabIndex: number = $state(0);

	const entries: Entry[] = $derived(page.data?.entries || []);
	const activeOfficers = $derived(
		(data.officers || []).filter((o) => !o.stop)
	);
	const activeBoardMembers = $derived(
		(data.boardMembers || []).filter((m) => !m.stop)
	);
</script>

<div class="w-full max-w-7xl mx-auto p-4 space-y-6">
	<h2 class="h2">{m.ASSOCIATION_TITLE()}</h2>

	<TabGroup>
		<Tab bind:group={tabIndex} name="officers" value={0}>
			{m.OFFICERS_SHORT()}
		</Tab>
		<Tab bind:group={tabIndex} name="boardMembers" value={1}>
			{m.BOARD_MEMBERS_SHORT()}
		</Tab>
		<svelte:fragment slot="panel">
			{#if tabIndex === 0}
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
					{#each activeOfficers as officer (officer.uid)}
						<OfficerCard
							{officer}
							{entries}
							organizationRoles={data.organizationRoles || []}
						/>
					{/each}
				</div>
				{#if !activeOfficers.length}
					<p class="text-center opacity-60">Aucun membre du bureau.</p>
				{/if}
			{:else if tabIndex === 1}
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
					{#each activeBoardMembers as member (member.uid)}
						<BoardMemberCard {member} {entries} />
					{/each}
				</div>
				{#if !activeBoardMembers.length}
					<p class="text-center opacity-60">Aucun membre du conseil d'administration.</p>
				{/if}
			{/if}
		</svelte:fragment>
	</TabGroup>
</div>

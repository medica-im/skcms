<script lang="ts">
	import { page } from '$app/state';
	import * as m from '$msgs';
	import { TabGroup, Tab } from '@skeletonlabs/skeleton';
	import OfficerCard from '$lib/Association/OfficerCard.svelte';
	import BoardMembersDisplay from '$lib/Association/BoardMembersDisplay.svelte';
	import type { Entry } from '$lib/store/directoryStoreInterface';

	let { data } = $props();

	let tabIndex: number = $state(0);

	const entries: Entry[] = $derived(page.data?.entries || []);
	const activeOfficers = $derived((data.officers || []).filter((o) => !o.stop));
	const activeBoardMembers = $derived((data.boardMembers || []).filter((m) => !m.stop));
</script>

<svelte:head>
	<title>{m.ASSOCIATION_TITLE()}</title>
</svelte:head>

<div class="w-full max-w-5xl mx-auto p-4 space-y-6">
	<TabGroup>
		<Tab bind:group={tabIndex} name="officers" value={0}>
			{m.OFFICERS_SHORT()}
		</Tab>
		<Tab bind:group={tabIndex} name="boardMembers" value={1}>
			{m.BOARD_MEMBERS_SHORT()}
		</Tab>
		<svelte:fragment slot="panel">
			{#if tabIndex === 0}
				<div class="space-y-6 lg:space-y-8">
					<h2 class="h2">{m.ASSOCIATION_TITLE()} > {m.OFFICERS()}</h2>

					<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
						{#each activeOfficers as officer (officer.uid)}
							<OfficerCard
								{officer}
								{entries}
								organizationRoles={data.organizationRoles || []}
								organizationRoleLabels={data.organizationRoleLabels || {}}
							/>
						{/each}
					</div>
				</div>
				{#if !activeOfficers.length}
					<p class="text-center opacity-60">{m.NO_OFFICER()}</p>
				{/if}
			{:else if tabIndex === 1}
							<div class="space-y-6 lg:space-y-8">

				<h2 class="h2">{m.ASSOCIATION_TITLE()} > {m.BOARD_MEMBERS()}</h2>

				<BoardMembersDisplay
					boardMembers={activeBoardMembers}
					membershipCategories={data.membershipCategories || []}
					{entries}
				/>
				</div>
			{/if}
		</svelte:fragment>
	</TabGroup>
</div>

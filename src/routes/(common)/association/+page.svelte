<script lang="ts">
	import { page } from '$app/state';
	import * as m from '$msgs';
	import { TabGroup, Tab } from '@skeletonlabs/skeleton';
	import OfficerCard from '$lib/Association/OfficerCard.svelte';
	import BoardMembersDisplay from '$lib/Association/BoardMembersDisplay.svelte';
	import type { Entry } from '$lib/store/directoryStoreInterface';

	const joinModules = import.meta.glob('../../(skvar)/(svlt)/(association)/Join.svelte', { eager: true });
	const JoinComponent: any = (Object.values(joinModules)[0] as any)?.default ?? null;

	let { data } = $props();

	let tabIndex: number = $state(0);

	const entries: Entry[] = $derived(page.data?.entries || []);
	const activeOfficers = $derived((data.officers || []).filter((o) => !o.stop));
	const activeBoardMembers = $derived((data.boardMembers || []).filter((bm) => !bm.stop));
</script>

<svelte:head>
	<title>{m.ASSOCIATION_TITLE()}</title>
</svelte:head>

<div class="w-full max-w-5xl mx-auto p-4 space-y-6">
	<TabGroup
		active="variant-filled-primary"
		hover="hover:variant-soft-primary"
	>
		<Tab bind:group={tabIndex} name="officers" value={0}>
			{m.OFFICERS_SHORT()}
		</Tab>
		<Tab bind:group={tabIndex} name="boardMembers" value={1}>
			{m.BOARD_MEMBERS_SHORT()}
		</Tab>
		{#if JoinComponent}
		<Tab bind:group={tabIndex} name="join" value={2}>
			{m.JOIN()}
		</Tab>
		{/if}
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
			{:else if tabIndex === 2 && JoinComponent}
							<div class="space-y-6 lg:space-y-8">

				<h2 class="h2">{m.ASSOCIATION_TITLE()} > {m.JOIN()}</h2>
			<JoinComponent />
			</div>
			{/if}
		</svelte:fragment>
	</TabGroup>
</div>

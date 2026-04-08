<script lang="ts">
	import { page } from '$app/state';
	import * as m from '$msgs';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import { TabGroup, Tab } from '@skeletonlabs/skeleton';
	import BoardMembersPanel from '$lib/Web/Association/BoardMembersPanel.svelte';
	import OfficersPanel from '$lib/Web/Association/OfficersPanel.svelte';
	import OrganizationRolesPanel from '$lib/Web/Association/OrganizationRolesPanel.svelte';
	import MembershipCategoriesPanel from '$lib/Web/Association/MembershipCategoriesPanel.svelte';

	let { data } = $props();

	const isSuperUser = $derived(page.data?.user?.role === 'superuser');
	const isAdmin = $derived(
		page.data?.user?.role === 'superuser' || page.data?.user?.role === 'administrator'
	);
	const entryUid = $derived(page.data?.organization?.uid);

	let tabIndex: number = $state(0);
</script>

<div class="w-full max-w-7xl mx-auto p-4 space-y-6">
	<h2 class="h2">{capitalizeFirstLetter(m.ASSOCIATION_TITLE())}</h2>

	{#if !isAdmin}
		<div class="card variant-ghost-warning p-4">
			<p>{m.ADMIN_ACCESS_RESTRICTED()}</p>
		</div>
	{:else}
		<TabGroup>
			<Tab bind:group={tabIndex} name="officers" value={0}>
				{m.OFFICERS()}
			</Tab>
			<Tab bind:group={tabIndex} name="boardMembers" value={1}>
				{m.BOARD_MEMBERS()}
			</Tab>
			<Tab bind:group={tabIndex} name="membershipCategories" value={2}>
				{capitalizeFirstLetter(m.MEMBERSHIP_CATEGORY({ count: 2 }))}
			</Tab>
			{#if isSuperUser}
				<Tab bind:group={tabIndex} name="organizationRoles" value={3}>
					{m.ORGANIZATION_ROLES()}
				</Tab>
			{/if}
			<svelte:fragment slot="panel">
				{#if tabIndex === 0}
					<OfficersPanel
						officers={data.officers || []}
						effectors={data.effectors || []}
						organizationRoles={data.organizationRoles || []}
						{entryUid}
					/>
				{:else if tabIndex === 1}
					<BoardMembersPanel
						boardMembers={data.boardMembers || []}
						effectors={data.effectors || []}
						membershipCategories={data.membershipCategories || []}
						{entryUid}
					/>
				{:else if tabIndex === 2}
					<MembershipCategoriesPanel
						membershipCategories={data.membershipCategories || []}
						{entryUid}
					/>
				{:else if tabIndex === 3 && isSuperUser}
					<OrganizationRolesPanel
						organizationRoles={data.organizationRoles || []}
					/>
				{/if}
			</svelte:fragment>
		</TabGroup>
	{/if}
</div>

<script lang="ts">
	import * as m from '$msgs';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import type { MembershipCategory } from '$lib/interfaces/v2/association';
	import MembershipCategoryRow from './MembershipCategoryRow.svelte';
	import CreateMembershipCategory from './CreateMembershipCategory.svelte';

	let {
		membershipCategories,
		entryUid
	}: {
		membershipCategories: MembershipCategory[];
		entryUid: string;
	} = $props();
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h3 class="h3">{capitalizeFirstLetter(m.MEMBERSHIP_CATEGORY({ count: 2 }))}</h3>
		<CreateMembershipCategory {entryUid} />
	</div>

	<!-- Header (desktop) -->
	<div class="hidden lg:grid lg:grid-cols-[1fr_100px] lg:gap-4 px-3 text-sm font-semibold text-surface-600">
		<span>{m.COL_LABEL()}</span>
		<span class="text-center">{m.COL_ACTIONS()}</span>
	</div>

	{#if membershipCategories.length === 0}
		<p class="text-surface-500 text-center py-4">—</p>
	{:else}
		{#each membershipCategories as category (category.uid)}
			<MembershipCategoryRow {category} />
		{/each}
	{/if}
</div>

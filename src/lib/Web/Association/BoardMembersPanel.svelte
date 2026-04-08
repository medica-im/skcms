<script lang="ts">
	import * as m from '$msgs';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import type { BoardMember, MembershipCategory } from '$lib/interfaces/v2/association';
	import type { Effector } from '$lib/interfaces/v2/effector';
	import BoardMemberRow from './BoardMemberRow.svelte';
	import CreateBoardMember from './CreateBoardMember.svelte';

	let {
		boardMembers,
		effectors,
		membershipCategories,
		entryUid
	}: {
		boardMembers: BoardMember[];
		effectors: Effector[];
		membershipCategories: MembershipCategory[];
		entryUid: string;
	} = $props();

	let selectedCategoryUid: string = $state('');
	let filteredBoardMembers = $derived(
		selectedCategoryUid
			? boardMembers.filter((m) => m.category_uid === selectedCategoryUid)
			: boardMembers
	);
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h3 class="h3">{capitalizeFirstLetter(m.BOARD_MEMBERS())}</h3>
		<CreateBoardMember {effectors} {membershipCategories} {entryUid} />
	</div>

	<!-- Header (desktop) -->
	<div class="hidden lg:grid lg:grid-cols-[1fr_320px_120px_120px_80px_100px] lg:gap-4 px-3 text-sm font-semibold text-surface-600">
		<span>{m.COL_EFFECTOR()}</span>
		<span>
			<select class="select select-sm" bind:value={selectedCategoryUid}>
				<option value="">{m.COL_CATEGORY()} — {m.FILTER_ALL()}</option>
				{#each membershipCategories as cat (cat.uid)}
					<option value={cat.uid}>{cat.label}</option>
				{/each}
			</select>
		</span>
		<span>{m.COL_START()}</span>
		<span>{m.COL_STOP()}</span>
		<span class="text-center">{m.STATUS_ACTIVE()}</span>
		<span class="text-center">{m.COL_ACTIONS()}</span>
	</div>

	{#if filteredBoardMembers.length === 0}
		<p class="text-surface-500 text-center py-4">—</p>
	{:else}
		{#each filteredBoardMembers as member (member.uid)}
			<BoardMemberRow {member} {effectors} {membershipCategories} />
		{/each}
	{/if}
</div>

<script lang="ts">
	import * as m from '$msgs';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import type { BoardMember } from '$lib/interfaces/v2/association';
	import type { Effector } from '$lib/interfaces/v2/effector';
	import BoardMemberRow from './BoardMemberRow.svelte';
	import CreateBoardMember from './CreateBoardMember.svelte';

	let {
		boardMembers,
		effectors,
		entryUid
	}: {
		boardMembers: BoardMember[];
		effectors: Effector[];
		entryUid: string;
	} = $props();
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h3 class="h3">{capitalizeFirstLetter(m.BOARD_MEMBERS())}</h3>
		<CreateBoardMember {effectors} {entryUid} />
	</div>

	<!-- Header (desktop) -->
	<div class="hidden lg:grid lg:grid-cols-[1fr_120px_120px_80px_100px] lg:gap-4 px-3 text-sm font-semibold text-surface-600">
		<span>{m.COL_EFFECTOR()}</span>
		<span>{m.COL_START()}</span>
		<span>{m.COL_STOP()}</span>
		<span class="text-center">{m.STATUS_ACTIVE()}</span>
		<span class="text-center">{m.COL_ACTIONS()}</span>
	</div>

	{#if boardMembers.length === 0}
		<p class="text-surface-500 text-center py-4">—</p>
	{:else}
		{#each boardMembers as member (member.uid)}
			<BoardMemberRow {member} {effectors} />
		{/each}
	{/if}
</div>

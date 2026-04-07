<script lang="ts">
	import * as m from '$msgs';
	import type { BoardMember, MembershipCategory } from '$lib/interfaces/v2/association';
	import type { Entry } from '$lib/store/directoryStoreInterface';
	import BoardMemberCard from './BoardMemberCard.svelte';

	let {
		boardMembers,
		membershipCategories,
		entries
	}: {
		boardMembers: BoardMember[];
		membershipCategories: MembershipCategory[];
		entries: Entry[];
	} = $props();

	let hasCategories = $derived(membershipCategories.length > 0);
</script>

{#if hasCategories}
	<div class="space-y-8">
		{#each membershipCategories as category, i (category.uid)}
			{@const members = boardMembers.filter((bm) => bm.category_uid === category.uid)}
			<div class="space-y-6">
				<h4 class="h4">{category.label}</h4>
				{#if members.length > 0}
					<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
						{#each members as member (member.uid)}
							<BoardMemberCard {member} {entries} categoryLabel={category.label} />
						{/each}
					</div>
				{:else}
					<p class="opacity-60">{m.VACANT()}</p>
				{/if}
				{#if i < membershipCategories.length - 1}
					<hr class="!border-t-2 !border-surface-300-600-token mt-4" />
				{/if}
			</div>
		{/each}
	</div>
{:else if boardMembers.length > 0}
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		{#each boardMembers as member (member.uid)}
			<BoardMemberCard {member} {entries} />
		{/each}
	</div>
{:else}
	<p class="text-center opacity-60">{m.NO_BOARD_MEMBER()}</p>
{/if}

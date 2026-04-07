<script lang="ts">
	import * as m from '$msgs';
	import type { BoardMember, MembershipCategory } from '$lib/interfaces/v2/association';
	import type { Effector } from '$lib/interfaces/v2/effector';
	import UpdateBoardMember from './UpdateBoardMember.svelte';
	import DeleteBoardMember from './DeleteBoardMember.svelte';

	let {
		member,
		effectors,
		membershipCategories
	}: {
		member: BoardMember;
		effectors: Effector[];
		membershipCategories: MembershipCategory[];
	} = $props();

	let effectorName = $derived(
		effectors.find((e) => e.uid === member.effector_uid)?.name_fr || member.effector_uid
	);
	let categoryLabel = $derived(
		member.category_uid
			? membershipCategories.find((c) => c.uid === member.category_uid)?.label || ''
			: ''
	);
	let isActive = $derived(!member.stop);
</script>

<div class="card variant-ghost p-3 flex flex-col gap-2 lg:grid lg:grid-cols-[1fr_320px_120px_120px_80px_100px] lg:items-center lg:gap-4">
	<span class="font-medium">
		<span class="lg:hidden text-sm text-surface-500">{m.COL_EFFECTOR()}: </span>
		{effectorName}
	</span>
	<span>
		<span class="lg:hidden text-sm text-surface-500">{m.COL_CATEGORY()}: </span>
		{categoryLabel || '—'}
	</span>
	<span>
		<span class="lg:hidden text-sm text-surface-500">{m.COL_START()}: </span>
		{member.start}
	</span>
	<span>
		<span class="lg:hidden text-sm text-surface-500">{m.COL_STOP()}: </span>
		{member.stop || '—'}
	</span>
	<span class="lg:text-center">
		{#if isActive}
			<span class="badge variant-filled-success text-xs">{m.STATUS_ACTIVE()}</span>
		{:else}
			<span class="badge variant-filled-surface text-xs">{m.STATUS_ENDED()}</span>
		{/if}
	</span>
	<div class="flex items-center gap-1 lg:justify-center">
		<UpdateBoardMember {member} />
		{#if isActive}
			<DeleteBoardMember {member} />
		{/if}
	</div>
</div>

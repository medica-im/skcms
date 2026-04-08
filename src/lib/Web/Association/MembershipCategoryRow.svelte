<script lang="ts">
	import type { MembershipCategory } from '$lib/interfaces/v2/association';
	import UpdateMembershipCategory from './UpdateMembershipCategory.svelte';
	import DeleteMembershipCategory from './DeleteMembershipCategory.svelte';

	let {
		category
	}: {
		category: MembershipCategory;
	} = $props();
</script>

<div class="card variant-ghost p-3 flex items-center justify-between lg:grid lg:grid-cols-[1fr_100px] lg:gap-4">
	<span class="font-medium">{category.label}</span>
	<div class="flex items-center gap-1 lg:justify-center">
		<UpdateMembershipCategory {category} />
		<DeleteMembershipCategory {category} />
	</div>
</div>

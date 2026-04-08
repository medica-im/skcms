<script lang="ts">
	import type { OrganizationRole } from '$lib/interfaces/v2/association';
	import UpdateOrganizationRole from './UpdateOrganizationRole.svelte';
	import DeleteOrganizationRole from './DeleteOrganizationRole.svelte';

	let {
		role
	}: {
		role: OrganizationRole;
	} = $props();
</script>

<div class="card variant-ghost p-3 flex items-center justify-between lg:grid lg:grid-cols-[1fr_100px] lg:gap-4">
	<span class="font-medium">{role.label}</span>
	<div class="flex items-center gap-1 lg:justify-center">
		<UpdateOrganizationRole {role} />
		<DeleteOrganizationRole {role} />
	</div>
</div>

<script lang="ts">
	import * as m from '$msgs';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import type { OrganizationRole } from '$lib/interfaces/v2/association';
	import OrganizationRoleRow from './OrganizationRoleRow.svelte';
	import CreateOrganizationRole from './CreateOrganizationRole.svelte';

	let {
		organizationRoles
	}: {
		organizationRoles: OrganizationRole[];
	} = $props();
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h3 class="h3">{capitalizeFirstLetter(m.ORGANIZATION_ROLES())}</h3>
		<CreateOrganizationRole />
	</div>

	<!-- Header (desktop) -->
	<div class="hidden lg:grid lg:grid-cols-[1fr_100px] lg:gap-4 px-3 text-sm font-semibold text-surface-600">
		<span>{m.COL_LABEL()}</span>
		<span class="text-center">{m.COL_ACTIONS()}</span>
	</div>

	{#if organizationRoles.length === 0}
		<p class="text-surface-500 text-center py-4">—</p>
	{:else}
		{#each organizationRoles as role (role.uid)}
			<OrganizationRoleRow {role} />
		{/each}
	{/if}
</div>

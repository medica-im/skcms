<script lang="ts">
	import * as m from '$msgs';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import type { Officer, OrganizationRole } from '$lib/interfaces/v2/association';
	import type { Effector } from '$lib/interfaces/v2/effector';
	import OfficerRow from './OfficerRow.svelte';
	import CreateOfficer from './CreateOfficer.svelte';

	let {
		officers,
		effectors,
		organizationRoles,
		entryUid
	}: {
		officers: Officer[];
		effectors: Effector[];
		organizationRoles: OrganizationRole[];
		entryUid: string;
	} = $props();
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h3 class="h3">{capitalizeFirstLetter(m.OFFICERS())}</h3>
		<CreateOfficer {effectors} {organizationRoles} {entryUid} />
	</div>

	<!-- Header (desktop) -->
	<div class="hidden lg:grid lg:grid-cols-[1fr_1fr_120px_120px_80px_100px] lg:gap-4 px-3 text-sm font-semibold text-surface-600">
		<span>{m.COL_EFFECTOR()}</span>
		<span>{m.COL_ROLE()}</span>
		<span>{m.COL_START()}</span>
		<span>{m.COL_STOP()}</span>
		<span class="text-center">{m.STATUS_ACTIVE()}</span>
		<span class="text-center">{m.COL_ACTIONS()}</span>
	</div>

	{#if officers.length === 0}
		<p class="text-surface-500 text-center py-4">—</p>
	{:else}
		{#each officers as officer (officer.uid)}
			<OfficerRow {officer} {effectors} {organizationRoles} />
		{/each}
	{/if}
</div>

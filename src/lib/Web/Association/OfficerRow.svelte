<script lang="ts">
	import * as m from '$msgs';
	import type { Officer, OrganizationRole } from '$lib/interfaces/v2/association';
	import type { Effector } from '$lib/interfaces/v2/effector';
	import UpdateOfficer from './UpdateOfficer.svelte';
	import DeleteOfficer from './DeleteOfficer.svelte';

	let {
		officer,
		effectors,
		organizationRoles
	}: {
		officer: Officer;
		effectors: Effector[];
		organizationRoles: OrganizationRole[];
	} = $props();

	let effectorName = $derived(
		effectors.find((e) => e.uid === officer.effector_uid)?.name_fr || officer.effector_uid
	);
	let roleName = $derived(
		officer.role_label || organizationRoles.find((r) => r.uid === officer.role_uid)?.label || officer.role_uid
	);
	let isActive = $derived(!officer.stop);
</script>

<div class="card variant-ghost p-3 flex flex-col gap-2 lg:grid lg:grid-cols-[1fr_1fr_120px_120px_80px_100px] lg:items-center lg:gap-4">
	<span class="font-medium">
		<span class="lg:hidden text-sm text-surface-500">{m.COL_EFFECTOR()}: </span>
		{effectorName}
	</span>
	<span>
		<span class="lg:hidden text-sm text-surface-500">{m.COL_ROLE()}: </span>
		{roleName}
	</span>
	<span>
		<span class="lg:hidden text-sm text-surface-500">{m.COL_START()}: </span>
		{officer.start}
	</span>
	<span>
		<span class="lg:hidden text-sm text-surface-500">{m.COL_STOP()}: </span>
		{officer.stop || '—'}
	</span>
	<span class="lg:text-center">
		{#if isActive}
			<span class="badge variant-filled-success text-xs">{m.STATUS_ACTIVE()}</span>
		{:else}
			<span class="badge variant-filled-surface text-xs">{m.STATUS_ENDED()}</span>
		{/if}
	</span>
	<div class="flex items-center gap-1 lg:justify-center">
		<UpdateOfficer {officer} {organizationRoles} />
		{#if isActive}
			<DeleteOfficer {officer} />
		{/if}
	</div>
</div>

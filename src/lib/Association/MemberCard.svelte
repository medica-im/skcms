<script lang="ts">
	import { Avatar } from '@skeletonlabs/skeleton';
	import { faUser } from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import * as m from '$msgs';
	import { getLocale } from '../../paraglide/runtime.js';
	import type { BoardMember, Officer, OrganizationRole } from '$lib/interfaces/v2/association';
	import type { Entry } from '$lib/store/directoryStoreInterface';
	import type { Labels } from '$lib/interfaces/label.interace';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import { base } from '$app/paths';

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString(getLocale(), {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	function isOfficer(m: BoardMember | Officer): m is Officer {
		return 'role_uid' in m;
	}

	let {
		member,
		entries,
		organizationRoles = [],
		organizationRoleLabels = {}
	}: {
		member: BoardMember | Officer;
		entries: Entry[];
		organizationRoles?: OrganizationRole[];
		organizationRoleLabels?: Labels;
	} = $props();

	let matchedEntries = $derived(
		entries.filter((e) => e.effector_uid === member.effector_uid)
	);
	let firstEntry = $derived(matchedEntries[0]);
	let name = $derived(firstEntry?.name || member.effector_uid);
	let avatarSrc = $derived(
		firstEntry?.avatar?.sm || firstEntry?.avatar?.lg || firstEntry?.avatar?.raw || ''
	);
	let roleName = $derived.by(() => {
		if (!isOfficer(member)) return '';
		const gender = firstEntry?.gender as 'F' | 'M' | 'N' | null;
		const raw = gender && organizationRoleLabels[member.role_uid]?.S?.[gender]
			? organizationRoleLabels[member.role_uid].S[gender]!
			: member.role_label ||
				organizationRoles.find((r) => r.uid === member.role_uid)?.label ||
				'';
		return capitalizeFirstLetter(raw);
	});
	let uniqueTypes = $derived.by(() => {
		const seen = new Set<string>();
		return matchedEntries.filter((e) => {
			const label = e.effector_type?.label;
			if (!label || seen.has(label)) return false;
			seen.add(label);
			return true;
		});
	});
</script>

<a
	href={firstEntry ? `${base}/e/${firstEntry.entrySlug}` : undefined}
	class="flex flex-col lg:flex-row variant-soft-surface rounded-lg overflow-hidden hover:variant-ghost-primary transition-colors"
>
	<div class="p-4 shrink-0">
		<Avatar src={avatarSrc} width="w-16 lg:w-20" rounded="rounded-none">
			<Fa icon={faUser} size="lg" />
		</Avatar>
	</div>
	<div class="p-4 space-y-1 flex-1">
		<h3 class="h3">{name}</h3>
		{#if roleName}
			<p class="text-lg font-semibold">{roleName}</p>
		{/if}
		{#if uniqueTypes.length}
			<p class="text-sm opacity-70">
				{#each uniqueTypes as entry, i}{entry.effector_type.label}{#if i < uniqueTypes.length - 1}, {/if}{/each}
			</p>
		{/if}
		<p class="text-sm opacity-60">{m.COL_START()}: {formatDate(member.start)}</p>
	</div>
</a>

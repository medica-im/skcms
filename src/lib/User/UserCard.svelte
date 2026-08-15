<script lang="ts">
	import type { User } from '$lib/interfaces/v2/user';
	import type { Role } from '$lib/interfaces/v2/invitee';
	import Fa from 'svelte-fa';
	import { faEnvelope, faUser, faEye } from '@fortawesome/free-solid-svg-icons';
	import RoleBadge from '$lib/RoleBadge.svelte';

	let { user, showLink = true }: { user: User; showLink?: boolean } = $props();

	function formatDate(timestamp: number | null): string {
		if (!timestamp) return '—';
		const date = new Date(timestamp);
		const day = String(date.getDate()).padStart(2, '0');
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const year = date.getFullYear();
		return `${day}/${month}/${year}`;
	}

	let primaryRole = $derived(
		user.access.length > 0 ? user.access[0].role as Role : 'anonymous' as Role
	);
</script>

<div class="card variant-ghost p-3 flex flex-col gap-3 lg:grid lg:grid-cols-[40px_1fr_1.5fr_150px_120px_36px] lg:items-center lg:justify-items-start lg:gap-4 hover:variant-soft transition-colors">
	<!-- Avatar/Icon -->
	<div class="flex items-center gap-3 lg:contents">
		<div class="w-10 h-10 rounded-full bg-surface-500/10 flex items-center justify-center flex-shrink-0">
			<Fa icon={faUser} class="text-surface-600" />
		</div>

		<!-- Name -->
		<span class="font-semibold truncate">{user.name || '—'}</span>
	</div>

	<!-- Email -->
	<div class="flex items-center gap-2 text-surface-600 min-w-0">
		<span class="w-4 flex-shrink-0"><Fa icon={faEnvelope} size="sm" /></span>
		<span class="truncate">{user.email || '—'}</span>
	</div>

	<!-- Role Badge -->
	<RoleBadge role={primaryRole} uniform />

	<!-- Created Date -->
	<span class="text-sm text-surface-500">
		{formatDate(user.createdAt)}
	</span>

	<!-- Detail Link -->
	{#if showLink}
		<a href="/web/users/{user.uid}" class="btn-icon btn-icon-sm variant-ghost-primary">
			<Fa icon={faEye} />
		</a>
	{/if}
</div>

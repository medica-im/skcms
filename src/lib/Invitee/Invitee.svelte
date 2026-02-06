<script lang="ts">
	import type { Invitee, Role } from '$lib/interfaces/v2/invitee';
	import * as m from '$msgs';
	import Fa from 'svelte-fa';
	import { faEnvelope, faUser, faUserShield, faCircle } from '@fortawesome/free-solid-svg-icons';

	let { invitee }: { invitee: Invitee } = $props();

	const roleLabels: Record<Role, string> = {
		superuser: m['ROLE.SUPERUSER'](),
		administrator: m['ROLE.ADMINISTRATOR'](),
		staff: m['ROLE.STAFF'](),
		registered: m['ROLE.REGISTERED'](),
		anonymous: m['ROLE.ANONYMOUS']()
	};

	const roleVariants: Record<Role, string> = {
		superuser: 'variant-filled-error',
		administrator: 'variant-filled-warning',
		staff: 'variant-filled-primary',
		registered: 'variant-filled-secondary',
		anonymous: 'variant-ghost-surface'
	};

	function formatDate(dateString: string | null): string {
		if (!dateString) return '';
		const date = new Date(dateString);
		return date.toLocaleDateString('fr-FR', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<div class="card variant-ghost p-3 flex items-center gap-3 hover:variant-soft transition-colors">
	<!-- Avatar/Icon -->
	<div class="flex-shrink-0">
		<div class="w-10 h-10 rounded-full bg-surface-500/10 flex items-center justify-center">
			<Fa icon={faUser} class="text-surface-600" />
		</div>
	</div>

	<!-- Main Content -->
	<div class="flex-grow min-w-0">
		<!-- Name & Email Row -->
		<div class="flex items-center gap-2 mb-1">
			{#if invitee.name}
				<span class="font-semibold text-sm truncate">{invitee.name}</span>
			{/if}
			<div class="flex items-center gap-1 text-xs text-surface-600 truncate">
				<Fa icon={faEnvelope} size="xs" />
				<span class="truncate">{invitee.email}</span>
			</div>
		</div>

		<!-- Role & Status Row -->
		<div class="flex items-center gap-2 flex-wrap">
			<span class="badge {roleVariants[invitee.role]} badge-sm">
				<Fa icon={faUserShield} size="xs" />
				<span class="ml-1">{roleLabels[invitee.role]}</span>
			</span>

			{#if invitee.createdAt}
				<span class="text-xs text-surface-500">
					{formatDate(invitee.createdAt)}
				</span>
			{/if}
		</div>
	</div>

	<!-- Status Indicator -->
	<div class="flex-shrink-0">
		<div class="flex items-center gap-1">
			<Fa
				icon={faCircle}
				size="xs"
				class={invitee.active ? 'text-success-500' : 'text-surface-400'}
			/>
			<span class="text-xs text-surface-600">
				{invitee.active ? 'Active' : 'Inactive'}
			</span>
		</div>
	</div>
</div>

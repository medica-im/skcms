<script lang="ts">
	/**
	 * The status filter above the invitations list: a segmented control, one
	 * button per status with its count. Same on every screen size -- a
	 * four-way choice is one tap, never a menu. The icons are the status
	 * badges' (InviteeStatus), and each button carries its word too, so the
	 * choice never depends on colour. See InviteeStatusFilter.svelte.test.ts.
	 */
	import Fa from 'svelte-fa';
	import { faCircle, type IconDefinition } from '@fortawesome/free-solid-svg-icons';
	import { faCircleCheck, faCircleXmark } from '@fortawesome/free-regular-svg-icons';
	import * as m from '$msgs';
	import type { InviteeFilter } from './inviteeFilter';

	let {
		value,
		counts,
		onchange
	}: {
		value: InviteeFilter;
		counts: Record<InviteeFilter, number>;
		onchange: (filter: InviteeFilter) => void;
	} = $props();

	const options = $derived(
		(
			[
				['all', m.INVITEE_FILTER_ALL(), null, ''],
				['active', m.INVITEE_FILTER_ACTIVE(), faCircle, 'text-success-500'],
				['used', m.INVITEE_FILTER_USED(), faCircleCheck, ''],
				['disabled', m.INVITEE_FILTER_DISABLED(), faCircleXmark, '']
			] as [InviteeFilter, string, IconDefinition | null, string][]
		)
			// "Désactivées" is rare: shown when there is one, or while chosen.
			.filter(([key]) => key !== 'disabled' || counts.disabled > 0 || value === 'disabled')
	);
</script>

<!-- A 2×2 grid on a narrow screen, where four buttons would wrap unevenly;
     one row from sm up. -->
<div class="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" role="group" aria-label={m.INVITEE_FILTER_LABEL()}>
	{#each options as [key, label, icon, iconClass] (key)}
		{@const pressed = value === key}
		<button
			type="button"
			class="btn min-h-11 gap-2 px-4 {pressed ? 'variant-filled-primary' : 'variant-soft-surface'}"
			aria-pressed={pressed}
			onclick={() => onchange(key)}
		>
			{#if icon}
				<span class={pressed ? '' : iconClass} aria-hidden="true"><Fa {icon} /></span>
			{/if}
			<span>{label}</span>
			<span class="badge {pressed ? 'variant-soft' : 'variant-filled-surface'}">{counts[key]}</span>
		</button>
	{/each}
</div>

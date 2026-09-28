<script lang="ts">
	/**
	 * Whether an invitation can still be used, told three ways at once so no
	 * reader depends on colour: the SHAPE (a filled disc for the one that
	 * still works, a hollow ring for the others), the ICON inside the ring
	 * (a tick for used, a cross for deactivated) and the WORD.
	 *
	 * Replaces dimming a used invitation's row to 50% opacity, which made it
	 * hard to read. See InviteeStatus.svelte.test.ts.
	 */
	import Fa from 'svelte-fa';
	import { faCircle } from '@fortawesome/free-solid-svg-icons';
	import { faCircleCheck, faCircleXmark } from '@fortawesome/free-regular-svg-icons';
	import * as m from '$msgs';
	import { inviteeStatusOf } from './inviteeFilter';

	let { active, redeemedAt }: { active: boolean | null | undefined; redeemedAt: number | null | undefined } =
		$props();

	// The same rule the list's filter uses, so a badge never disagrees with it.
	const status = $derived(inviteeStatusOf({ active, redeemedAt }));
</script>

<span data-testid="invitee-status" data-state={status} class="inline-flex items-center gap-2 text-sm">
	{#if status === 'active'}
		<span data-testid="status-shape" data-shape="filled" class="text-success-500 drop-shadow-[0_0_4px_rgb(var(--color-success-500)/0.6)]" aria-hidden="true">
			<Fa icon={faCircle} size="lg" />
		</span>
		<span class="font-bold text-success-800-100-token">{m.INVITEE_STATUS_ACTIVE()}</span>
	{:else}
		<span data-testid="status-shape" data-shape="hollow" class="text-surface-600-300-token" aria-hidden="true">
			<Fa icon={status === 'used' ? faCircleCheck : faCircleXmark} size="lg" />
		</span>
		<span class="text-surface-700-200-token">
			{status === 'used' ? m.INVITEE_STATUS_USED() : m.INVITEE_STATUS_DISABLED()}
		</span>
	{/if}
</span>

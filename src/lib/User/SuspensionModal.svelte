<script lang="ts">
	import { page } from '$app/state';
	import Fa from 'svelte-fa';
	import { faPenToSquare, faBan, faRotateLeft } from '@fortawesome/free-solid-svg-icons';
	import * as m from '$msgs';
	import Dialog from '$lib/Web/Dialog.svelte';
	import { maySuspend } from '$lib/auth/grantable';
	import { suspendUser, restoreUser } from '../../user.remote.ts';

	/**
	 * Suspending an access, and lifting the suspension.
	 *
	 * A separate control from the role, because it answers a separate question:
	 * the role says what somebody may do, the suspension whether they may do
	 * anything at all. Collapsing the two into one form would invite changing a
	 * role and a suspension in a single act, which the history then has to
	 * record as one event and cannot explain.
	 *
	 * Suspension keeps the identity and the role — a suspended administrator
	 * stays a suspended administrator — so what is offered here is a state to
	 * toggle, never a demotion.
	 */
	let {
		userUid,
		suspended = false,
		suspensionReason = null,
		onchanged
	}: {
		userUid: string;
		suspended?: boolean;
		suspensionReason?: string | null;
		onchanged?: () => void;
	} = $props();

	const actorRole = $derived(page.data?.user?.role ?? 'anonymous');
	const canSuspend = $derived(maySuspend(actorRole));

	// Suspending yourself is a confusing logout that leaves nobody able to undo
	// it, so the control is not offered on your own account. The endpoint
	// refuses it too — this only avoids putting a button there that says no.
	const isSelf = $derived(page.data?.user?.uid === userUid);

	let dialog: HTMLDialogElement | undefined = $state();
	let reason = $state('');
	let busy = $state(false);
	let error = $state('');

	function open() {
		reason = '';
		error = '';
		dialog?.showModal();
	}

	async function act() {
		busy = true;
		error = '';
		const result = suspended
			? await restoreUser(userUid)
			: await suspendUser({ uid: userUid, reason: reason || undefined });
		busy = false;
		if (result.success) {
			dialog?.close();
			onchanged?.();
		} else {
			error =
				result.status === 403
					? m.ROLE_CHANGE_FORBIDDEN()
					: result.detail || m.ROLE_CHANGE_CONFLICT();
		}
	}
</script>

{#if canSuspend && !isSelf}
	<button
		type="button"
		class="btn btn-sm variant-ghost-primary"
		onclick={open}
		data-testid="suspension-edit"
		aria-label={suspended ? m.ACCESS_RESTORE() : m.ACCESS_SUSPEND()}
		title={suspended ? m.ACCESS_RESTORE() : m.ACCESS_SUSPEND()}
	>
		<Fa icon={faPenToSquare} />
	</button>

	<Dialog bind:dialog classProp="w-[90vw] sm:w-[28rem]">
		<div class="p-6" data-testid="suspension-modal">
			<h2 class="h3 mb-4">
				{suspended ? m.ACCESS_RESTORE() : m.ACCESS_SUSPEND()}
			</h2>

			{#if suspended}
				<p class="mb-4 text-sm">
					{m.ACCESS_SUSPENDED_BADGE()}{suspensionReason ? ` — ${suspensionReason}` : ''}
				</p>
			{:else}
				<label class="label mb-4 block">
					<span class="text-sm">{m.ACCESS_SUSPEND_REASON()}</span>
					<input
						class="input"
						type="text"
						bind:value={reason}
						disabled={busy}
						data-testid="suspend-reason"
					/>
				</label>
			{/if}

			{#if error}
				<p class="mb-4 text-sm text-error-700-200-token" data-testid="suspension-error">
					{error}
				</p>
			{/if}

			<div class="flex justify-end gap-2">
				<button
					type="button"
					class="btn variant-ghost-surface"
					onclick={() => dialog?.close()}
					disabled={busy}
				>
					{m.CANCEL()}
				</button>
				<button
					type="button"
					class="btn {suspended ? 'variant-filled-success' : 'variant-filled-error'}"
					disabled={busy}
					onclick={act}
					data-testid={suspended ? 'restore-user' : 'suspend-user'}
				>
					<span><Fa icon={suspended ? faRotateLeft : faBan} /></span>
					<span>{suspended ? m.ACCESS_RESTORE() : m.ACCESS_SUSPEND()}</span>
				</button>
			</div>
		</div>
	</Dialog>
{/if}

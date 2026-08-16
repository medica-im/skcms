<script lang="ts">
	import { page } from '$app/state';
	import Fa from 'svelte-fa';
	import { faPenToSquare } from '@fortawesome/free-solid-svg-icons';
	import * as m from '$msgs';
	import Dialog from '$lib/Web/Dialog.svelte';
	import RoleBadge from '$lib/RoleBadge.svelte';
	import { roleLabel } from '$lib/roles';
	import { grantableRoles } from '$lib/auth/grantable';
	import { changeUserRole } from '../../user.remote.ts';

	/**
	 * Changing a user's role, behind an icon and a modal.
	 *
	 * The icon appears only in edit mode, and the change itself happens in a
	 * dialog rather than inline: this is the setting that decides what somebody
	 * may do anywhere on the site, so it takes a deliberate second action rather
	 * than a stray click on a select that happened to be under the cursor.
	 *
	 * Only the roles this caller may actually grant are offered — but that is a
	 * courtesy, not the guard. The endpoint refuses the rest on its own, which
	 * is what a request made directly meets. See
	 * features/user-role-change.feature.
	 */
	let {
		userUid,
		currentRole,
		suspended = false,
		onchanged
	}: {
		userUid: string;
		currentRole: string;
		suspended?: boolean;
		onchanged?: () => void;
	} = $props();

	const actorRole = $derived(page.data?.user?.role ?? 'anonymous');
	const options = $derived(grantableRoles(actorRole, currentRole));

	let dialog: HTMLDialogElement | undefined = $state();
	let selected = $state('');
	let busy = $state(false);
	let error = $state('');

	// Nothing to submit until a different role is picked: re-saving the role
	// somebody already holds would write a superseded access recording a change
	// that never happened, and clutter the history with it.
	const canSubmit = $derived(!busy && selected !== '' && selected !== currentRole);

	function open() {
		selected = '';
		error = '';
		dialog?.showModal();
	}

	async function submit() {
		if (!canSubmit) return;
		busy = true;
		error = '';
		const result = await changeUserRole({ uid: userUid, role: selected });
		busy = false;
		if (result.success) {
			dialog?.close();
			// The caller reloads the page data, which is what redraws both the
			// role shown here and the history section below it.
			onchanged?.();
		} else {
			error = refusal(result.status, result.detail);
		}
	}

	/**
	 * A refusal in words the reader can act on.
	 *
	 * 403 and 409 are different answers — "not yours to do" against "cannot be
	 * done by anyone" — and telling them apart is what says whether asking
	 * somebody else would help.
	 */
	function refusal(status: number, detail?: string): string {
		if (status === 403) return m.ROLE_CHANGE_FORBIDDEN();
		if (status === 409) return detail || m.ROLE_CHANGE_CONFLICT();
		return m.ROLE_CHANGE_FAILED();
	}
</script>

{#if options.length > 0}
	<button
		type="button"
		class="btn btn-sm variant-ghost-primary"
		onclick={open}
		data-testid="role-edit"
		aria-label={m.ROLE_CHANGE_SUBMIT()}
		title={m.ROLE_CHANGE_SUBMIT()}
	>
		<Fa icon={faPenToSquare} />
	</button>

	<Dialog bind:dialog classProp="w-[90vw] sm:w-[28rem]">
		<div class="p-6" data-testid="role-change">
			<h2 class="h3 mb-4">{m.ROLE_CHANGE_TITLE()}</h2>

			<p class="mb-4 flex items-center gap-2 text-sm">
				<span class="text-surface-500">{m.ROLE_CHANGE_HISTORY_CURRENT()}</span>
				<RoleBadge role={currentRole} full />
			</p>

			{#if suspended}
				<!-- The role of a suspended access cannot change: a promotion
					 would arrive as a fresh access carrying no suspension, which
					 is exactly what the suspension exists to prevent. Saying so
					 beats a disabled control with no explanation. -->
				<p class="mb-4 text-sm text-warning-700-200-token" data-testid="role-change-blocked">
					{m.ROLE_CHANGE_SUSPENDED_BLOCKED()}
				</p>
			{/if}

			<label class="label mb-4 block">
				<span class="text-sm">{m.ROLE_CHANGE_NEW_ROLE()}</span>
				<select
					class="select"
					bind:value={selected}
					disabled={busy || suspended}
					data-testid="role-select"
					aria-label={m.ROLE_CHANGE_NEW_ROLE()}
				>
					<option value="">{m.ROLE_CHANGE_CHOOSE()}</option>
					{#each options as role (role)}
						<option value={role}>{roleLabel(role)}</option>
					{/each}
				</select>
			</label>

			{#if error}
				<p class="mb-4 text-sm text-error-700-200-token" data-testid="role-change-error">
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
					class="btn variant-filled-primary"
					disabled={!canSubmit || suspended}
					onclick={submit}
					data-testid="role-submit"
				>
					{m.ROLE_CHANGE_SUBMIT()}
				</button>
			</div>
		</div>
	</Dialog>
{/if}

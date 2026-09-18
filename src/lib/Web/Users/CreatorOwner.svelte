<script lang="ts">
	import Fa from 'svelte-fa';
	import { faUser, faCheck, faEye, faExclamationTriangle, faUserShield } from '@fortawesome/free-solid-svg-icons';
	import * as m from '$msgs';
	import type { User } from '$lib/interfaces/v2/user.ts';
	import type { Role } from '$lib/interfaces/v2/invitee.ts';
	import type { UserWithRoles } from './ownerCreator.ts';
	import { getEditMode } from '$lib/components/Directory/context';
	import RoleBadge from '$lib/RoleBadge.svelte';
	import PatchOwnerModal from './PatchOwnerModal.svelte';
	import { base } from '$app/paths';

	/**
	 * The owner / creator panel, told who to show rather than finding out.
	 *
	 * `users` arrives already resolved from the entry page's server load
	 * (resolveOwnerCreator, called from +page.server.ts). This component used to
	 * resolve the uids itself, awaiting the `getUser` remote query once per uid,
	 * and that could not work on a server-rendered page: `{#await}` renders its
	 * pending branch during SSR and never resolves there, so the html shipped
	 * "Chargement..." and the rows depended on a second client-side round trip
	 * after hydration. When that round trip failed the panel rendered "Aucun
	 * utilisateur associé" — indistinguishable from an entry that genuinely has
	 * nobody, which is how an empty panel went unexplained for so long.
	 *
	 * `owner` and `creator` are still taken, as lists of uids, even though the
	 * rows already carry `isOwner`/`isCreator`. They answer a question the rows
	 * cannot: *whether the entry names anybody in that capacity at all*. A
	 * lookup that 404s drops somebody from `users` while the entry still names
	 * them, so counting rows would report "no owner" for an entry that has one
	 * the API would not return — the same class of mistake as the bug this panel
	 * was rewritten for, where an empty list rendered as if it meant nobody.
	 * `owner` drives the missing-owner warning below and the editing modal;
	 * `creator` is kept alongside it so both halves stay equally trustworthy.
	 */
	let {
		owner,
		creator,
		users = []
	}: {
		owner: string[] | null;
		creator: string[] | null;
		users?: UserWithRoles[];
	} = $props();
	const editMode = getEditMode();

	function getPrimaryRole(user: User): Role {
		return user.access.length > 0 ? (user.access[0].role as Role) : ('anonymous' as Role);
	}

	/**
	 * Uids the entry names that no row accounts for.
	 *
	 * The load skips a uid whose lookup 404s — somebody deleted while an entry
	 * still names them — and without this the panel would render that as a
	 * shorter list and say nothing, which is the failure mode that hid the
	 * original bug. Counted from both lists, so an unresolvable creator is as
	 * visible as an unresolvable owner.
	 */
	const unresolved = $derived.by(() => {
		const named = [...new Set([...(owner ?? []), ...(creator ?? [])])];
		const shown = new Set(users.map((u) => u.uid));
		return named.filter((uid) => !shown.has(uid));
	});

</script>

<div class="d-flex justify-content-between align-items-start">
	<div class="flex items-center py-2">
		<div class="w-9"><Fa icon={faUserShield} size="sm" /></div>
		<div>
			<h4 class="h4 flex place-items-center gap-1">
				{m.owner()} / {m.creator()}
				{#if $editMode}<PatchOwnerModal currentOwners={owner} />{/if}
			</h4>
		</div>
	</div>

	{#if !owner?.length}
		<div class="flex items-center gap-2 p-2 variant-ghost-warning rounded-lg">
			<Fa icon={faExclamationTriangle} class="text-warning-500" />
			<span class="text-warning-700">Cette entrée n'a pas de propriétaire.</span>
		</div>
	{/if}

	{#if unresolved.length}
		<!--
			Somebody the entry names but the API would not return. Said out loud
			rather than left as a missing row: a silently shorter list is what
			made the original empty panel unreadable.
		-->
		<div class="flex items-center gap-2 p-2 variant-ghost-warning rounded-lg">
			<Fa icon={faExclamationTriangle} class="text-warning-500" />
			<span class="text-warning-700">{m.ERROR_LOADING_USERS()}</span>
		</div>
	{/if}

	<!--
		No loading state and no await: the rows are resolved by the page's server
		load and are in the server-rendered html, so there is nothing to wait for
		on either side.
	-->
	{#if users.length > 0}
		<div class="flex items-start p-1">
			<div class="w-9"></div>
			<div class="w-full">
				<!-- Column Headers -->
				<div
					class="grid grid-cols-1 sm:grid-cols-[1fr_1.5fr_120px_80px_80px_36px] items-center gap-2 px-3 pb-2 text-sm font-semibold text-surface-500"
				>
					<span></span>
					<span class="hidden sm:block"></span>
					<span class="hidden sm:block"></span>
					<span class="hidden sm:block text-center">{m.creator()}</span>
					<span class="hidden sm:block text-center">{m.owner()}</span>
					<span></span>
				</div>

				<div class="grid grid-cols-1 gap-2">
					{#each users as user (user.uid)}
						{@const role = getPrimaryRole(user)}
						<div
							class="grid grid-cols-1 sm:grid-cols-[1fr_1.5fr_120px_80px_80px_36px] items-center gap-2 p-2 variant-soft-surface hover:variant-ghost-surface"
						>
							<!-- Name -->
							<div class="flex items-center gap-3">
								<div
									class="w-8 h-8 rounded-full bg-surface-500/10 flex items-center justify-center flex-shrink-0"
								>
									<Fa icon={faUser} class="text-surface-600" size="sm" />
								</div>
								<span class="font-semibold truncate">{user.name || '—'}</span>
							</div>

							<!-- Email -->
							<span class="text-sm text-surface-500 truncate">{user.email || '—'}</span>

							<!-- Role Badge -->
							<RoleBadge {role} uniform />

							<!-- Creator check -->
							<div class="hidden sm:flex justify-center">
								{#if user.isCreator}
									<Fa icon={faCheck} class="text-success-500" />
								{/if}
							</div>

							<!-- Owner check -->
							<div class="hidden sm:flex justify-center">
								{#if user.isOwner}
									<Fa icon={faCheck} class="text-success-500" />
								{/if}
							</div>

							<!-- Link to user detail -->
							<a href="{base}/web/users/{user.uid}" class="btn-icon btn-icon-sm variant-ghost-primary">
								<Fa icon={faEye} />
							</a>

							<!-- Mobile badges -->
							<div class="flex gap-2 px-3 sm:hidden">
								{#if user.isCreator}
									<span class="badge variant-soft-secondary badge-sm">{m.creator()}</span>
								{/if}
								{#if user.isOwner}
									<span class="badge variant-soft-primary badge-sm">{m.owner()}</span>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	{:else}
		<!--
			Reached only when the entry really names nobody. A lookup that fails
			for any reason other than 404 throws in the load now, so the page's
			own error boundary reports it — this line can no longer stand in for
			"something went wrong", which is exactly what made the original bug
			invisible.
		-->
		<div class="p-2 text-surface-500">Aucun utilisateur associé.</div>
	{/if}
</div>

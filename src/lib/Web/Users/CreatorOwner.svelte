<script lang="ts">
	import { getUser } from '../../../user.remote.ts';
	import Fa from 'svelte-fa';
	import { faUser, faCheck, faEye, faExclamationTriangle, faUserShield } from '@fortawesome/free-solid-svg-icons';
	import * as m from '$msgs';
	import type { User } from '$lib/interfaces/v2/user.ts';
	import type { Role } from '$lib/interfaces/v2/invitee.ts';
	import { getEditMode } from '$lib/components/Directory/context';
	import RoleBadge from '$lib/RoleBadge.svelte';
	import PatchOwnerModal from './PatchOwnerModal.svelte';
	import { base } from '$app/paths';

	let { owner, creator }: { owner: string[] | null; creator: string[] | null } = $props();
	const editMode = getEditMode();

	interface UserWithRoles extends User {
		isOwner: boolean;
		isCreator: boolean;
	}

	function getPrimaryRole(user: User): Role {
		return user.access.length > 0 ? (user.access[0].role as Role) : ('anonymous' as Role);
	}

	/**
	 * The people named by either list, resolved.
	 *
	 * A `$derived` promise awaited in the markup, rather than an `$effect` that
	 * copied users into `$state`. That was the bug behind an entry showing
	 * "aucun utilisateur associé" while it had an owner: the effect read the
	 * `getUser` query once and assigned the result, so the rows never followed a
	 * change in the props — adding an owner upstream refreshed the query and
	 * handed this panel new uids, and the panel kept the answer it had copied.
	 *
	 * Deriving it means the framework owns the lifecycle: new props produce a new
	 * promise, `{#await}` renders whichever state it is in, and there is no
	 * second copy of the data to go stale. It is also the pattern the rest of the
	 * app already uses on a remote query — see Effectors.svelte,
	 * DisplayFacility.svelte, HeatwaveAlert.svelte.
	 */
	const users = $derived.by(async () => {
		const ownerUids = owner ?? [];
		const creatorUids = creator ?? [];
		// One lookup per person, not per mention: whoever created an entry
		// usually still owns it, and both lists then name the same uid.
		const allUids = [...new Set([...ownerUids, ...creatorUids])];

		const resolved = await Promise.all(
			allUids.map(async (uid) => {
				try {
					const user = await getUser(uid);
					if (!user) return null;
					return {
						...user,
						isOwner: ownerUids.includes(uid),
						isCreator: creatorUids.includes(uid)
					} satisfies UserWithRoles;
				} catch (error) {
					// One unresolvable uid must not take the rest of the list
					// down with it — a user may have been deleted while still
					// named on an entry.
					console.error(`Failed to fetch user ${uid}:`, error);
					return null;
				}
			})
		);

		return resolved.filter((u): u is UserWithRoles => u !== null);
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

	<!--
		Awaited here rather than assigned in an effect, so the rendered state
		follows the promise instead of a copy of its result. The same shape as
		every other remote-query consumer in the app (Effectors.svelte,
		DisplayFacility.svelte, HeatwaveAlert.svelte).
	-->
	{#await users}
		<div class="p-2 text-surface-500">Chargement...</div>
	{:then resolved}
		{#if resolved.length > 0}
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
					{#each resolved as user (user.uid)}
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
			<div class="p-2 text-surface-500">Aucun utilisateur associé.</div>
		{/if}
	{:catch}
		<!--
			A failure now says so. The previous version could not reach here:
			every lookup was caught per-uid and dropped, so an unauthorised or
			failing request rendered the same "no users" line as an entry that
			genuinely had none — which is how this went unnoticed.
		-->
		<div class="flex items-center gap-2 p-2 variant-ghost-error rounded-lg">
			<Fa icon={faExclamationTriangle} class="text-error-500" />
			<span>{m.ERROR_LOADING_USERS()}</span>
		</div>
	{/await}
</div>

<script lang="ts">
	import { getUser } from '../../../user.remote.ts';
	import Fa from 'svelte-fa';
	import { faUser, faCheck, faEye, faExclamationTriangle, faUserShield } from '@fortawesome/free-solid-svg-icons';
	import * as m from '$msgs';
	import type { User } from '$lib/interfaces/v2/user.ts';
	import type { Role } from '$lib/interfaces/v2/invitee.ts';
	import { getEditMode } from '$lib/components/Directory/context';
	import PatchOwnerModal from './PatchOwnerModal.svelte';

	let { owner, creator }: { owner: string[] | null; creator: string[] | null } = $props();
	const editMode = getEditMode();

	interface UserWithRoles extends User {
		isOwner: boolean;
		isCreator: boolean;
	}

	let users: UserWithRoles[] = $state([]);
	let loading: boolean = $state(true);

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

	function getPrimaryRole(user: User): Role {
		return user.access.length > 0 ? (user.access[0].role as Role) : ('anonymous' as Role);
	}

	$effect(() => {
		const ownerUids = owner ?? [];
		const creatorUids = creator ?? [];
		const allUids = [...new Set([...ownerUids, ...creatorUids])];

		(async () => {
			const fetchedUsers: UserWithRoles[] = [];
			for (const uid of allUids) {
				try {
					const user = await getUser(uid);
					if (user) {
						fetchedUsers.push({
							...user,
							isOwner: ownerUids.includes(uid),
							isCreator: creatorUids.includes(uid)
						});
					}
				} catch (error) {
					console.error(`Failed to fetch user ${uid}:`, error);
				}
			}
			users = fetchedUsers;
			loading = false;
		})();
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

	{#if loading}
		<div class="p-2 text-surface-500">Chargement...</div>
	{:else if users.length > 0}
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
							<span class="badge {roleVariants[role]} badge-sm w-fit">
								{roleLabels[role]}
							</span>

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
							<a href="/web/users/{user.uid}" class="btn-icon btn-icon-sm variant-ghost-primary">
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
</div>

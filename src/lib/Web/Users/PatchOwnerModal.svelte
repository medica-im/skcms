<script lang="ts">
	import { getEntryUid } from '$lib/components/Directory/context';
	import { invalidateAll } from '$app/navigation';
	import { patchCommand } from '../../../entry.remote';
	import { getUsers } from '../../../user.remote';
	import Dialog from '$lib/Web/Dialog.svelte';
	import Fa from 'svelte-fa';
	import {
		faPlus,
		faPenToSquare,
		faCheck,
		faExclamationCircle,
		faTrash,
		faMagnifyingGlass,
		faArrowDownAZ,
		faClock,
		faShieldHalved,
		faCaretUp,
		faCaretDown,
		faExpand,
		faCompress
	} from '@fortawesome/free-solid-svg-icons';
	import { areArraysEqualSets } from '$lib/utils/utils.ts';
	import type { User } from '$lib/interfaces/v2/user.ts';
	import type { Role } from '$lib/interfaces/v2/invitee.ts';
	import type { FormResult } from '$lib/interfaces/v2/form';
	import * as m from '$msgs';

	let { currentOwners }: { currentOwners: string[] | null } = $props();

	const entryUid = getEntryUid();

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

	const rolePriority: Record<Role, number> = {
		superuser: 0,
		administrator: 1,
		staff: 2,
		registered: 3,
		anonymous: 4
	};

	function getPrimaryRole(user: User): Role {
		return user.access.length > 0 ? (user.access[0].role as Role) : ('anonymous' as Role);
	}

	let dialog: HTMLDialogElement | undefined = $state();
	let allUsers: User[] = $state([]);
	let loading: boolean = $state(false);
	let initialOwners: string[] = $state([]);
	let selectedOwners: User[] = $state([]);
	let searchText: string = $state('');
	let sortBy: 'alpha' | 'date' | 'role' = $state('alpha');
	let sortAsc: boolean = $state(true);
	let maximized: boolean = $state(false);
	let result: FormResult | undefined = $state();

	function toggleSort(key: 'alpha' | 'date' | 'role') {
		if (sortBy === key) {
			sortAsc = !sortAsc;
		} else {
			sortBy = key;
			sortAsc = true;
		}
	}

	const selectedOwnerUids = $derived(selectedOwners.map((u) => u.uid));

	const disabled: boolean = $derived(
		!!patchCommand.pending ||
			areArraysEqualSets(initialOwners, selectedOwnerUids)
	);

	const filteredUsers = $derived.by(() => {
		const query = searchText.toLowerCase().trim();
		let filtered = allUsers.filter((u) => {
			if (!query) return true;
			return (
				(u.name?.toLowerCase().includes(query) ?? false) ||
				(u.email?.toLowerCase().includes(query) ?? false)
			);
		});
		const dir = sortAsc ? 1 : -1;
		if (sortBy === 'alpha') {
			filtered.sort((a, b) => dir * (a.name ?? '').localeCompare(b.name ?? ''));
		} else if (sortBy === 'date') {
			filtered.sort((a, b) => dir * ((b.createdAt ?? 0) - (a.createdAt ?? 0)));
		} else if (sortBy === 'role') {
			filtered.sort(
				(a, b) => dir * (rolePriority[getPrimaryRole(a)] - rolePriority[getPrimaryRole(b)])
			);
		}
		return filtered;
	});

	function addOwner(user: User) {
		if (!selectedOwnerUids.includes(user.uid)) {
			selectedOwners = [...selectedOwners, user];
			result = undefined;
		}
	}

	function removeOwner(uid: string) {
		selectedOwners = selectedOwners.filter((u) => u.uid !== uid);
		result = undefined;
	}

	function formatDate(timestamp: number | null): string {
		if (!timestamp) return '—';
		const date = new Date(timestamp);
		const day = String(date.getDate()).padStart(2, '0');
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const year = date.getFullYear();
		return `${day}/${month}/${year}`;
	}

	async function openModal() {
		result = undefined;
		initialOwners = currentOwners ?? [];
		loading = true;
		searchText = '';
		sortBy = 'alpha';
		dialog?.showModal();

		try {
			const users = await getUsers();
			allUsers = users ?? [];
			selectedOwners = allUsers.filter((u) => initialOwners.includes(u.uid));
		} catch (error) {
			console.error('Failed to load users:', error);
			allUsers = [];
			selectedOwners = [];
		}
		loading = false;
	}
</script>

<button
	onclick={openModal}
	class="btn-icon btn-icon-sm variant-ghost-surface"
	title="Modifier les propriétaires"
>
	<Fa icon={currentOwners?.length ? faPenToSquare : faPlus} />
</button>

<Dialog bind:dialog classProp={maximized ? 'w-[90vw] h-[90vh]' : 'max-w-full sm:max-w-[90vw] lg:max-w-5xl'}>
	<div class="rounded-lg w-full h-full p-4 variant-ghost-secondary overflow-auto {maximized ? '' : 'min-w-[min(32rem,90vw)]'}">
		<div class="space-y-4 p-2">
			<div class="flex items-center justify-between">
				<div></div>
				<h3 class="h3">Propriétaires</h3>
				<button
					class="btn-icon btn-icon-sm variant-ghost-surface"
					onclick={() => (maximized = !maximized)}
					title={maximized ? 'Réduire' : 'Agrandir'}
				>
					<Fa icon={maximized ? faCompress : faExpand} size="sm" />
				</button>
			</div>

			<!-- Current owners -->
			<div class="space-y-2">
				<h4 class="h4">Propriétaires actuels</h4>
				{#if selectedOwners.length === 0}
					<div class="flex items-center gap-2 p-3 variant-ghost-warning rounded-lg">
						<Fa icon={faExclamationCircle} class="text-warning-500" />
						<span class="text-sm">Cette entrée n'a pas de propriétaire.</span>
					</div>
				{:else}
					<div class="space-y-1">
						{#each selectedOwners as user (user.uid)}
							{@const role = getPrimaryRole(user)}
							<div
								class="flex items-center justify-between gap-2 p-2 variant-soft-surface rounded-lg"
							>
								<div class="flex items-center gap-3 min-w-0 flex-1">
									<div class="min-w-0">
										<p class="font-semibold text-sm truncate">{user.name || '—'}</p>
										<p class="text-xs text-surface-500 truncate">{user.email || '—'}</p>
									</div>
									<span class="badge {roleVariants[role]} badge-sm flex-shrink-0">
										{roleLabels[role]}
									</span>
								</div>
								<button
									class="btn-icon btn-icon-sm variant-ghost-error flex-shrink-0"
									onclick={() => removeOwner(user.uid)}
									title="Retirer"
								>
									<Fa icon={faTrash} size="sm" />
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Add owners -->
			<div class="space-y-2">
				<h4 class="h4">Ajouter un propriétaire</h4>

				<!-- Search -->
				<div class="input-group input-group-divider grid-cols-[auto_1fr]">
					<div class="input-group-shim"><Fa icon={faMagnifyingGlass} size="sm" /></div>
					<input
						type="search"
						class="input"
						placeholder="Rechercher par nom ou email..."
						bind:value={searchText}
					/>
				</div>

				<!-- Sort chips -->
				<div class="flex gap-1 flex-wrap">
					<button
						class="chip {sortBy === 'alpha' ? 'variant-filled-primary' : 'variant-soft-surface'}"
						onclick={() => toggleSort('alpha')}
					>
						<Fa icon={faArrowDownAZ} size="sm" />
						<span class="text-xs">A-Z</span>
						{#if sortBy === 'alpha'}<Fa icon={sortAsc ? faCaretDown : faCaretUp} size="sm" />{/if}
					</button>
					<button
						class="chip {sortBy === 'date' ? 'variant-filled-primary' : 'variant-soft-surface'}"
						onclick={() => toggleSort('date')}
					>
						<Fa icon={faClock} size="sm" />
						<span class="text-xs">Date</span>
						{#if sortBy === 'date'}<Fa icon={sortAsc ? faCaretDown : faCaretUp} size="sm" />{/if}
					</button>
					<button
						class="chip {sortBy === 'role' ? 'variant-filled-primary' : 'variant-soft-surface'}"
						onclick={() => toggleSort('role')}
					>
						<Fa icon={faShieldHalved} size="sm" />
						<span class="text-xs">Rôle</span>
						{#if sortBy === 'role'}<Fa icon={sortAsc ? faCaretDown : faCaretUp} size="sm" />{/if}
					</button>
				</div>

				<!-- User list -->
				{#if loading}
					<div class="max-h-64 overflow-y-auto space-y-1 rounded-lg border border-surface-300 p-1 animate-pulse">
						{#each Array(5) as _}
							<div class="flex items-center justify-between gap-2 p-2 rounded-lg">
								<div class="flex items-center gap-3 min-w-0 flex-1">
									<div class="min-w-0 flex-1 space-y-2 w-full">
										<div class="placeholder"></div>
										<div class="placeholder h-3"></div>
									</div>
									<div class="placeholder w-20 h-5 flex-shrink-0"></div>
								</div>
								<div class="placeholder-circle w-8 h-8 flex-shrink-0"></div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="{maximized ? 'flex-1' : 'max-h-64'} overflow-y-auto rounded-lg border border-surface-300 p-1 lg:grid lg:grid-cols-[1fr_1.5fr_150px_80px_36px] lg:gap-x-2">
						{#each filteredUsers as user (user.uid)}
							{@const role = getPrimaryRole(user)}
							{@const isSelected = selectedOwnerUids.includes(user.uid)}
							<div
								class="flex lg:col-span-5 lg:grid lg:grid-cols-subgrid items-center gap-2 p-2 rounded-lg {isSelected
									? 'variant-ghost-success'
									: 'hover:variant-ghost-surface'}"
							>
								<div class="min-w-0 flex-1 lg:contents">
									<p class="font-semibold text-sm truncate">{user.name || '—'}</p>
									<p class="text-xs text-surface-500 truncate">{user.email || '—'}</p>
								</div>
								<span class="badge {roleVariants[role]} badge-sm flex-shrink-0">
									{roleLabels[role]}
								</span>
								<span class="text-xs text-surface-400 hidden lg:block flex-shrink-0">
									{formatDate(user.createdAt)}
								</span>
								{#if isSelected}
									<span class="btn-icon btn-icon-sm text-success-500 flex-shrink-0">
										<Fa icon={faCheck} size="sm" />
									</span>
								{:else}
									<button
										class="btn-icon btn-icon-sm variant-ghost-primary flex-shrink-0"
										onclick={() => addOwner(user)}
										title="Ajouter"
									>
										<Fa icon={faPlus} size="sm" />
									</button>
								{/if}
							</div>
						{/each}
						{#if filteredUsers.length === 0}
							<div class="p-4 text-center text-surface-500 text-sm">Aucun utilisateur trouvé.</div>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Actions -->
			<div class="flex flex-wrap gap-4 justify-end">
				<div class="flex gap-2 items-center">
					{#if result?.success}
						<span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
					{:else if result && !result?.success}
						<span class="badge-icon variant-filled-error"
							><Fa icon={faExclamationCircle} /></span
						>{result.text}
					{/if}
				</div>
				<button
					type="button"
					class="variant-filled-secondary btn w-min"
					onclick={async () => {
						try {
							result = await patchCommand({
								entry: entryUid,
								owners: selectedOwnerUids
							});
							if (result?.success) {
								initialOwners = [...selectedOwnerUids];
							}
							invalidateAll();
						} catch (error) {
							console.error(error);
						}
					}}
					{disabled}>Confirmer</button
				>
				<button
					type="button"
					class="variant-filled-error btn w-min"
					onclick={() => {
						dialog?.close();
					}}>{result?.success || disabled ? 'Fermer' : 'Annuler'}</button
				>
			</div>
		</div>
	</div>
</Dialog>

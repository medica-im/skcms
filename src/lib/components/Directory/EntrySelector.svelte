<script lang="ts">
	import { variables } from '$lib/utils/constants';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import { getUsers } from '../../../user.remote.ts';
	import { getSelectedOwners } from './context';
	import Tag from '$lib/Tag/Tag.svelte';
	import * as m from '$msgs';
	import type { Entry } from '$lib/store/directoryStoreInterface';
	import type { User } from '$lib/interfaces/v2/user.ts';
	import type { OwnerInfo } from './context';

	let { data, avatar = true }: { data: Map<string, Entry[]>; avatar: boolean } = $props();

	const selectedOwners = getSelectedOwners();

	// Flatten all entries from the Map
	let allEntries: Entry[] = $derived([...data.values()].flat());

	// Selection state: Set of entry UIDs, all selected by default
	let selected: Set<string> = $state(new Set());

	// Initialize selection when entries change
	$effect(() => {
		selected = new Set(allEntries.map((e) => e.uid));
	});

	let allSelected = $derived(selected.size === allEntries.length && allEntries.length > 0);
	let someSelected = $derived(selected.size > 0 && selected.size < allEntries.length);

	function toggleAll() {
		if (allSelected) {
			selected = new Set();
		} else {
			selected = new Set(allEntries.map((e) => e.uid));
		}
	}

	function toggleEntry(uid: string) {
		const next = new Set(selected);
		if (next.has(uid)) {
			next.delete(uid);
		} else {
			next.add(uid);
		}
		selected = next;
	}

	// Fetch users and build lookup map
	let userMap: Map<string, User> = $state(new Map());
	let loadingUsers = $state(true);

	$effect(() => {
		(async () => {
			const users = await getUsers();
			if (users) {
				const map = new Map<string, User>();
				for (const user of users) {
					map.set(user.uid, user);
				}
				userMap = map;
			}
			loadingUsers = false;
		})();
	});

	// Get first owner User for an entry
	function getOwner(entry: Entry): User | undefined {
		if (!entry.owner?.length) return undefined;
		return userMap.get(entry.owner[0]);
	}

	// Avatar URL helper
	function avatarUrl(entry: Entry): string {
		if (entry.avatar?.sm) return variables.BASE_URI + entry.avatar.sm;
		if (entry.avatar?.raw) return variables.BASE_URI + entry.avatar.raw;
		return '/media/profile_images/default_profile_picture.png';
	}

	// Update selected owners context reactively
	$effect(() => {
		const owners = new Map<string, OwnerInfo>();
		for (const entry of allEntries) {
			if (!selected.has(entry.uid)) continue;
			if (!entry.owner?.length) continue;
			for (const ownerUid of entry.owner) {
				const user = userMap.get(ownerUid);
				if (user) {
					owners.set(user.uid, {
						uid: user.uid,
						name: user.name,
						email: user.email
					});
				}
			}
		}
		$selectedOwners = owners;
	});
</script>

<div class="overflow-x-auto">
	<table class="table table-compact w-full">
		<thead>
			<tr class="text-sm font-semibold text-surface-500">
				<th class="w-10">
					<input
						type="checkbox"
						checked={allSelected}
						indeterminate={someSelected}
						onchange={toggleAll}
						class="checkbox"
					/>
				</th>
				{#if avatar}<th class="w-10"></th>{/if}
				<th>Nom</th>
				<th>Type</th>
				<th>{capitalizeFirstLetter(m.tag({ count: 2 }))}</th>
				<th>Commune</th>
				<th>Dépt.</th>
				<th>{capitalizeFirstLetter(m.owner())}</th>
				<th>Email</th>
			</tr>
		</thead>
		<tbody>
			{#each allEntries as entry (entry.uid)}
				{@const owner = getOwner(entry)}
				<tr class="hover:variant-ghost-surface">
					<td>
						<input
							type="checkbox"
							checked={selected.has(entry.uid)}
							onchange={() => toggleEntry(entry.uid)}
							class="checkbox"
						/>
					</td>
					{#if avatar}
						<td>
							<img
								src={avatarUrl(entry)}
								alt={entry.name}
								class="h-8 w-8 rounded-full object-cover"
							/>
						</td>
					{/if}
					<td class="font-semibold truncate max-w-48">{entry.name}</td>
					<td class="text-sm italic truncate max-w-32">{entry.effector_type?.label || ''}</td>
					<td><Tag data={entry.tags} compact={true} /></td>
					<td class="text-sm truncate max-w-24">{entry.commune?.name || ''}</td>
					<td class="text-sm">{entry.department?.code || ''}</td>
					<td class="text-sm truncate max-w-32">
						{#if loadingUsers}
							<span class="placeholder animate-pulse w-20 h-4"></span>
						{:else}
							{owner?.name || '—'}
						{/if}
					</td>
					<td class="text-sm truncate max-w-40">
						{#if loadingUsers}
							<span class="placeholder animate-pulse w-24 h-4"></span>
						{:else}
							{owner?.email || '—'}
						{/if}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

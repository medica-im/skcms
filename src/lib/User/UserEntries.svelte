<script lang="ts">
	import { page } from '$app/state';
	import { Avatar } from '@skeletonlabs/skeleton';
	import { faUser, faCheck } from '@fortawesome/free-solid-svg-icons';
	import { entryUrl } from '$lib/utils/utils.ts';
	import Fa from 'svelte-fa';
	import type { Entry } from '$lib/store/directoryStoreInterface';
	import * as m from '$msgs';

	let { userUid }: { userUid: string } = $props();

	const org = $derived(page.data.organization?.category?.name);
	const allEntries: Entry[] = $derived(page.data.entries ?? []);

	let userEntries = $derived(
		allEntries.filter((e: Entry) => e.owner?.includes(userUid) || e.creator?.includes(userUid))
	);
</script>

{#if userEntries.length > 0}
	<div>
		<!-- Column Headers -->
		<div
			class="grid grid-cols-1 sm:grid-cols-[1fr_80px_80px] items-center gap-2 px-3 pb-2 text-sm font-semibold text-surface-500"
		>
			<span
				>{m.my_entries()} <span class="badge variant-soft-primary ml-1">{userEntries.length}</span></span
			>
			<span class="hidden sm:block text-center">{m.creator()}</span>
			<span class="hidden sm:block text-center">{m.owner()}</span>
		</div>

		<div class="grid grid-cols-1 gap-4">
			{#each userEntries as entry (entry.uid)}
				<div
					class="grid grid-cols-1 sm:grid-cols-[1fr_80px_80px] items-center gap-2 p-2 variant-soft-surface hover:variant-ghost-surface"
				>
					<!-- Entry card -->
					<a href={entryUrl(entry, page.url.pathname, org, true)} class="no-underline">
						<div class="grid lg:grid-cols-[10%_45%_45%] sm:grid-cols-1 flex flex-wrap p-1 items-center gap-3 transition-colors">
							{#if entry.avatar?.fb || entry.avatar?.raw}
								<Avatar
									src={entry.avatar.fb || entry.avatar.raw}
									width="w-10"
									rounded="rounded-full"
								/>
							{:else}
								<div
									class="w-10 h-10 rounded-full bg-surface-500/10 flex items-center justify-center flex-shrink-0"
								>
									<Fa icon={faUser} class="text-surface-600" />
								</div>
							{/if}
							<div class="min-w-0">
								<p class="font-semibold truncate">{entry.name}</p>
								<p class="text-sm text-surface-500 italic truncate">{entry.effector_type?.label}</p>
							</div>
							<div class="">
								<ul>
									{#if entry.address.building}
										{entry.address.building}
									{/if}
									<li>{entry.address.street || 'MISSING ADDRESS FIELD: STREET'}</li>
									{#if entry.address.geographical_complement}
										<li>({entry.address.geographical_complement})</li>
									{/if}
									<li>
										<div class="flex">
											<!--div>{entry.address.zip || 'MISSING ADDRESS FIELD: ZIP'}</div>
			<div>&nbsp;</div-->
											<div><b>{entry.address.city || 'MISSING ADDRESS FIELD: CITY'}</b></div>
										</div>
									</li>
								</ul>
							</div>
						</div>
					</a>

					<!-- Creator check -->
					<div class="hidden sm:flex justify-center">
						{#if entry.creator?.includes(userUid)}
							<Fa icon={faCheck} class="text-success-500" />
						{/if}
					</div>

					<!-- Owner check -->
					<div class="hidden sm:flex justify-center">
						{#if entry.owner?.includes(userUid)}
							<Fa icon={faCheck} class="text-success-500" />
						{/if}
					</div>

					<!-- Mobile: role badges -->
					<div class="flex gap-2 px-3 sm:hidden">
						{#if entry.creator?.includes(userUid)}
							<span class="badge variant-soft-secondary badge-sm">{m.creator()}</span>
						{/if}
						{#if entry.owner?.includes(userUid)}
							<span class="badge variant-soft-primary badge-sm">{m.owner()}</span>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>
{:else}
	<div class="flex justify-center py-4">
		<a href="/web" class="btn btn-lg variant-ghost-primary text-lg font-semibold px-8 py-4 shadow-md hover:shadow-lg transition-shadow">{m.create_entry_cta()}</a>
	</div>
{/if}

<script lang="ts">
	import * as m from '$msgs';
	import {
		sortEntries,
		summarise,
		lastModifiedOf,
		type AdminEntry,
		type SortColumn,
		type SortDirection
	} from './entriesTable';

	let { entries = [] }: { entries: AdminEntry[] } = $props();

	// Newest first: an administrator opening this page is usually looking for
	// what changed recently, not for the oldest entry in the directory.
	let column = $state<SortColumn>('createdAt');
	let direction = $state<SortDirection>('desc');

	const sorted = $derived(sortEntries(entries, column, direction));
	const counts = $derived(summarise(entries));

	function sortBy(next: SortColumn) {
		if (column === next) {
			direction = direction === 'asc' ? 'desc' : 'asc';
		} else {
			column = next;
			// Dates read newest-first, text reads A-Z. Starting every column
			// ascending would make a click on "Création" show 2019 first.
			direction = next === 'createdAt' || next === 'lastModified' ? 'desc' : 'asc';
		}
	}

	const dateFormat = new Intl.DateTimeFormat('fr', { dateStyle: 'short', timeStyle: 'short' });
	const showDate = (ms: number | null) => (ms === null ? '—' : dateFormat.format(new Date(ms)));

	const arrow = (c: SortColumn) => (column !== c ? '' : direction === 'asc' ? '↑' : '↓');
</script>

<div class="space-y-4">
	<!-- The figures an administrator scans before reading a single row.
	     "sans propriétaire" is the actionable one: an entry nobody owns is an
	     entry nobody can edit, and it is invisible everywhere else. -->
	<div class="flex flex-wrap gap-4 text-sm">
		<span class="badge variant-soft">{counts.total} {m.admin_entries_total()}</span>
		<span class="badge variant-soft-success">{counts.active} {m.admin_entries_active()}</span>
		<span class="badge variant-soft-warning">{counts.inactive} {m.admin_entries_inactive()}</span>
		<span class="badge variant-soft-error">
			{counts.withoutOwner} {m.admin_entries_without_owner()}
		</span>
	</div>

	{#if sorted.length === 0}
		<p class="opacity-70">{m.admin_entries_none()}</p>
	{:else}
		<div class="table-container overflow-x-auto">
			<table class="table table-hover table-compact">
				<thead>
					<tr>
						{#each [['name', m.admin_entries_col_person()], ['type', m.admin_entries_col_type()], ['facility', m.admin_entries_col_facility()], ['active', m.admin_entries_col_state()], ['createdAt', m.admin_entries_col_created()], ['lastModified', m.admin_entries_col_modified()]] as [key, label]}
							<th>
								<button
									type="button"
									class="flex items-center gap-1 hover:underline"
									onclick={() => sortBy(key as SortColumn)}
									aria-sort={column === key
										? direction === 'asc'
											? 'ascending'
											: 'descending'
										: 'none'}
								>
									{label}<span aria-hidden="true">{arrow(key as SortColumn)}</span>
								</button>
							</th>
						{/each}
						<th>{m.admin_entries_col_creator()}</th>
						<th>{m.admin_entries_col_owner()}</th>
						<th>{m.admin_entries_col_access()}</th>
						<th>{m.admin_entries_col_directories()}</th>
					</tr>
				</thead>
				<tbody>
					{#each sorted as entry (entry.uid)}
						<tr>
							<td>
								{#if entry.slug}
									<a class="anchor" href="/e/{entry.slug}">{entry.name ?? entry.slug}</a>
								{:else}
									{entry.name ?? entry.uid}
								{/if}
							</td>
							<td>{entry.effector_type?.name ?? '—'}</td>
							<td>
								{#if entry.facility?.slug}
									<!-- /sites/, not /web/facility/: the latter has only a
									     create/ subroute and 404s for any slug. -->
									<a class="anchor" href="/sites/{entry.facility.slug}">
										{entry.facility.name}
									</a>
								{:else}
									{entry.facility?.name ?? '—'}
								{/if}
							</td>
							<td>
								{#if entry.active}
									<span class="badge variant-soft-success">{m.admin_entries_active()}</span>
								{:else}
									<!-- Why it is inactive is the first question an
									     administrator asks, so the reason travels with
									     the badge rather than hiding on a detail page. -->
									<span
										class="badge variant-soft-warning"
										title={[
											entry.deactivation_datetime
												? `${m.admin_entries_deactivated_on()} ${entry.deactivation_datetime}`
												: null,
											entry.deactivation_reason
										]
											.filter(Boolean)
											.join(' — ')}
									>
										{m.admin_entries_inactive()}
									</span>
								{/if}
							</td>
							<td class="whitespace-nowrap">{showDate(entry.createdAt)}</td>
							<td class="whitespace-nowrap">{showDate(lastModifiedOf(entry))}</td>
							<td>
								{#each entry.creators as user, i}
									{#if i > 0},&nbsp;{/if}
									<a class="anchor" href="/web/users/{user.uid}">{user.name ?? user.uid}</a>
								{:else}
									—
								{/each}
							</td>
							<td>
								{#each entry.owners as user, i}
									{#if i > 0},&nbsp;{/if}
									<a class="anchor" href="/web/users/{user.uid}">{user.name ?? user.uid}</a>
								{:else}
									<span class="badge variant-soft-error">{m.admin_entries_no_owner()}</span>
								{/each}
							</td>
							<td>{entry.access}</td>
							<td>{entry.directories.join(', ') || '—'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

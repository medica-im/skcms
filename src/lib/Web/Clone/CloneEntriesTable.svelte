<script lang="ts">
	import {
		sortEntries, paginate, lastModifiedOf, addressLine, allSelected,
		DEFAULT_PAGE_SIZE,
		type SourceEntry, type CloneSortColumn, type SortDirection
	} from './cloneTable';

	/**
	 * The source instance's entries, to pick from.
	 *
	 * Laid out like the administrative entries table rather than as a checkbox
	 * list: a superuser choosing what to clone is doing the same work as one
	 * reading /web/entries — scanning names, occupations, places and dates — and
	 * two different tables for one job is two things to learn.
	 *
	 * Entries that already exist here are shown, greyed and unselectable, rather
	 * than hidden. Hiding them would leave a superuser wondering why a colleague
	 * they can see on the source is missing from the list; showing them says
	 * "already done" and links to the local copy.
	 */
	let {
		entries = [],
		alreadyHere = {},
		origin = '',
		selected = $bindable([]),
		pageSize = $bindable(DEFAULT_PAGE_SIZE)
	}: {
		entries?: SourceEntry[];
		alreadyHere?: Record<string, string>;
		origin?: string;
		selected?: string[];
		pageSize?: number;
	} = $props();

	// Newest first, like the admin table: somebody cloning is usually after what
	// was added recently.
	let column = $state<CloneSortColumn>('createdAt');
	let direction = $state<SortDirection>('desc');
	let page = $state(1);

	const sorted = $derived(sortEntries(entries, column, direction));
	const view = $derived(paginate(sorted, page, pageSize));
	const selectable = $derived(entries.filter((e) => !alreadyHere[e.uid]));
	const pageAllSelected = $derived(allSelected(view.rows, selected, alreadyHere));

	const dateFormat = new Intl.DateTimeFormat('fr', { dateStyle: 'short', timeStyle: 'short' });
	const showDate = (ms: number | null | undefined) =>
		ms === null || ms === undefined ? '—' : dateFormat.format(new Date(ms));
	const arrow = (c: CloneSortColumn) => (column !== c ? '' : direction === 'asc' ? '↑' : '↓');

	function sortBy(next: CloneSortColumn) {
		if (column === next) {
			direction = direction === 'asc' ? 'desc' : 'asc';
		} else {
			column = next;
			// Dates read newest-first, text reads A-Z.
			direction = next === 'createdAt' || next === 'lastModified' ? 'desc' : 'asc';
		}
	}

	function toggleAllOnPage() {
		const ids = view.rows.filter((r) => !alreadyHere[r.uid]).map((r) => r.uid);
		selected = pageAllSelected
			? selected.filter((id) => !ids.includes(id))
			: [...new Set([...selected, ...ids])];
	}

	/** The avatar, resolved against the source — the path is relative to it. */
	const avatarOf = (e: SourceEntry) => {
		const path = e.avatar?.sm || e.avatar?.raw;
		return path ? `${origin}${path}` : null;
	};

	const initials = (name = '') =>
		name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';
</script>

<div class="space-y-3">
	<div class="flex flex-wrap items-center gap-4 text-sm">
		<span>
			<strong>{entries.length}</strong> fiche(s) ·
			<strong>{selected.length}</strong> sélectionnée(s)
			{#if entries.length - selectable.length > 0}
				· {entries.length - selectable.length} déjà présente(s)
			{/if}
		</span>
		<label class="flex items-center gap-2">
			<span class="opacity-75">Par page</span>
			<input
				class="input w-20"
				type="number"
				min="5"
				step="5"
				bind:value={pageSize}
				onchange={() => (page = 1)}
			/>
		</label>
	</div>

	<div class="table-container">
		<table class="table table-compact table-hover">
			<thead>
				<tr>
					<th class="w-10">
						<input
							type="checkbox"
							class="checkbox"
							checked={pageAllSelected}
							onchange={toggleAllOnPage}
							aria-label="Tout sélectionner sur cette page"
						/>
					</th>
					<th class="w-12"></th>
					<th>
						<button class="flex items-center gap-1 hover:underline" onclick={() => sortBy('name')}>
							Nom <span>{arrow('name')}</span>
						</button>
					</th>
					<th>
						<button class="flex items-center gap-1 hover:underline" onclick={() => sortBy('type')}>
							Profession <span>{arrow('type')}</span>
						</button>
					</th>
					<th>
						<button class="flex items-center gap-1 hover:underline" onclick={() => sortBy('facility')}>
							Établissement <span>{arrow('facility')}</span>
						</button>
					</th>
					<th>
						<button class="flex items-center gap-1 hover:underline" onclick={() => sortBy('createdAt')}>
							Création <span>{arrow('createdAt')}</span>
						</button>
					</th>
					<th>
						<button class="flex items-center gap-1 hover:underline" onclick={() => sortBy('lastModified')}>
							Modification <span>{arrow('lastModified')}</span>
						</button>
					</th>
				</tr>
			</thead>
			<tbody>
				{#each view.rows as entry (entry.uid)}
					{@const here = alreadyHere[entry.uid]}
					<tr class={here ? 'opacity-50' : ''}>
						<td>
							<input
								type="checkbox"
								class="checkbox"
								value={entry.uid}
								bind:group={selected}
								disabled={!!here}
								aria-label={here ? 'Déjà présente ici' : `Sélectionner ${entry.name ?? ''}`}
							/>
						</td>
						<td>
							{#if avatarOf(entry)}
								<img
									class="h-8 w-8 rounded-full object-cover"
									src={avatarOf(entry)}
									alt=""
									loading="lazy"
								/>
							{:else}
								<!-- Initials rather than a shared placeholder image: it tells
								     one row from the next, and costs no request. -->
								<span
									class="badge-icon variant-soft h-8 w-8 text-xs"
									aria-hidden="true">{initials(entry.name)}</span
								>
							{/if}
						</td>
						<td>
							<span class="font-medium">{entry.name ?? '—'}</span>
							{#if here}
								<span class="badge variant-soft-warning ml-2 text-xs">déjà ici</span>
							{/if}
						</td>
						<td>{entry.effector_type?.label ?? entry.effector_type?.name ?? '—'}</td>
						<td>
							{#if entry.facility?.name || entry.facility?.label}
								<div>{entry.facility.name ?? entry.facility.label}</div>
							{/if}
							{#if addressLine(entry)}
								<div class="text-xs opacity-75">{addressLine(entry)}</div>
							{:else if !entry.facility?.name && !entry.facility?.label}
								—
							{/if}
						</td>
						<td class="whitespace-nowrap">{showDate(entry.createdAt)}</td>
						<td class="whitespace-nowrap">{showDate(lastModifiedOf(entry))}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	{#if view.pages > 1}
		<div class="flex items-center justify-center gap-3">
			<button class="btn btn-sm variant-ghost" disabled={view.page <= 1} onclick={() => (page = view.page - 1)}>
				← Précédent
			</button>
			<span class="text-sm">Page {view.page} / {view.pages}</span>
			<button
				class="btn btn-sm variant-ghost"
				disabled={view.page >= view.pages}
				onclick={() => (page = view.page + 1)}
			>
				Suivant →
			</button>
		</div>
	{/if}
</div>

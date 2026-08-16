<script lang="ts">
	import Fa from 'svelte-fa';
	import { faClockRotateLeft } from '@fortawesome/free-solid-svg-icons';
	import * as m from '$msgs';
	import RoleBadge from '$lib/RoleBadge.svelte';
	import type { AccessHistory } from '$lib/interfaces/v2/user';

	/**
	 * Every role this user has held here, newest first.
	 *
	 * A role is never edited in place — changing one deactivates the old access
	 * and creates another — so this is not a log written alongside the change;
	 * it *is* the data. An audit trail nobody can see is one nobody can check,
	 * which is why it has a section rather than only an endpoint.
	 *
	 * Who made each change is shown as the role they held at the time, not the
	 * one they hold now: an administrator demoted next month still acted as an
	 * administrator today.
	 */
	// Handed in already loaded rather than fetched here: this route is
	// client-only (`ssr = false`), and a remote query issued from such a page
	// reaches the server without its argument — refused by the schema before
	// the handler runs. The loader fetches it beside the user it belongs to.
	let { rows = [] }: { rows?: AccessHistory[] } = $props();

	function formatDateTime(timestamp: number | null): string {
		if (!timestamp) return '—';
		const date = new Date(timestamp);
		const day = String(date.getDate()).padStart(2, '0');
		const month = String(date.getMonth() + 1).padStart(2, '0');
		return `${day}/${month}/${date.getFullYear()} ${date.toLocaleTimeString('fr-FR', {
			hour: '2-digit',
			minute: '2-digit'
		})}`;
	}
</script>

<section class="mt-8" data-testid="access-history">
	<h2 class="h3 mb-4 flex items-center gap-2">
		<Fa icon={faClockRotateLeft} class="text-primary-500" />
		{m.ROLE_CHANGE_HISTORY()}
	</h2>

		{#if rows && rows.length > 0}
			<div class="grid grid-cols-1 gap-2">
				{#each rows as row (row.uid)}
					<div
						class="card variant-ghost p-4"
						data-testid="history-row"
						data-role={row.role}
					>
						<div class="grid grid-cols-1 gap-3 md:grid-cols-3">
							<div>
								<span class="text-sm text-surface-500">
									{row.active ? m.ROLE_CHANGE_HISTORY_CURRENT() : m.COL_ROLE()}
								</span>
								<p><RoleBadge role={row.role} full /></p>
							</div>
							<div>
								<span class="text-sm text-surface-500">
									{row.active ? '' : m.ROLE_CHANGE_HISTORY_UNTIL()}
								</span>
								<p>
									{row.active
										? formatDateTime(row.createdAt)
										: formatDateTime(row.supersededAt)}
								</p>
							</div>
							<div>
								<!-- The actor's role at the time, not their role now. -->
								{#if row.createdByName || row.createdByRole}
									<span class="text-sm text-surface-500">
										{m.ROLE_CHANGE_HISTORY_BY()}
									</span>
									<p class="flex flex-wrap items-center gap-2">
										{#if row.createdByName}
											<span>{row.createdByName}</span>
										{/if}
										{#if row.createdByRole}
											<!-- The role carried as an attribute as well
												 as a badge: the badge's text is a
												 translation, so anything reading it would
												 be asserting on the UI language rather
												 than on who acted. -->
											<span data-actor-role={row.createdByRole}>
												<RoleBadge role={row.createdByRole} />
											</span>
										{/if}
									</p>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<p class="text-surface-500">{m.ROLE_CHANGE_HISTORY_EMPTY()}</p>
		{/if}
</section>

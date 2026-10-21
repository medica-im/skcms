<script lang="ts">
	import Fa from 'svelte-fa';
	import { faArrowLeft, faEye } from '@fortawesome/free-solid-svg-icons';
	import * as m from '$msgs';
	import type { PageData } from './$types';
	import { base } from '$app/paths';
	import { batchJobStatus } from '$lib/Invitee/batchJobStatus';

	let { data }: { data: PageData } = $props();
	let jobs = $derived(data.jobs ?? []);

	function formatDateTime(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('fr-FR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<div class="container mx-auto p-4 max-w-4xl">
	<header class="mb-6">
		<a href="{base}/web/invite/invitees" class="btn btn-sm variant-ghost mb-4">
			<Fa icon={faArrowLeft} class="mr-2" />
			{m.BATCH_INVITEE_BACK()}
		</a>
		<h1 class="h1 mb-2">{m.BATCH_INVITEE_LOGS()}</h1>
	</header>

	{#if jobs.length === 0}
		<div class="card p-6 text-center text-surface-500">
			<p>Aucun historique de création en masse.</p>
		</div>
	{:else}
		<div class="table-container">
			<table class="table table-hover">
				<thead>
					<tr>
						<th>Date</th>
						<th>{m.BATCH_INVITEE_STATUS()}</th>
						<th>{m.INVITEE_COL_ROLE()}</th>
						<th class="text-center">Total</th>
						<th class="text-center">{m.BATCH_INVITEE_CREATED()}</th>
						<th class="text-center">Ignorées</th>
						<th class="text-center">{m.BATCH_INVITEE_FAILED()}</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each jobs as job}
						{@const status = batchJobStatus(job.status)}
						<tr>
							<td>{formatDateTime(job.created_at)}</td>
							<td>
								<span class="flex items-center gap-1 {status.className}">
									<Fa icon={status.icon} class={job.status === 'processing' ? 'animate-spin' : ''} />
									{status.label}
								</span>
							</td>
							<td>{job.role}</td>
							<td class="text-center">{job.total_rows}</td>
							<td class="text-center text-success-500">{job.successful_count}</td>
							<td class="text-center text-surface-500">{job.skipped_duplicate_email_count + job.skipped_active_user_count}</td>
							<td class="text-center text-error-500">{job.failed_count}</td>
							<td>
								<a href="{base}/web/invite/batch-logs/{job.uid}" class="btn btn-sm variant-ghost-primary">
									<Fa icon={faEye} />
								</a>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<script lang="ts">
	import { goto } from '$app/navigation';
	import Fa from 'svelte-fa';
	import {
		faArrowLeft,
		faCheck,
		faXmark,
		faBan,
		faSpinner,
		faClock,
		faEye
	} from '@fortawesome/free-solid-svg-icons';
	import * as m from '$msgs';
	import type { PageData } from './$types';

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

	function statusIcon(status: string) {
		switch (status) {
			case 'completed': return faCheck;
			case 'cancelled': return faBan;
			case 'failed': return faXmark;
			case 'processing': return faSpinner;
			default: return faClock;
		}
	}

	function statusClass(status: string): string {
		switch (status) {
			case 'completed': return 'text-success-500';
			case 'cancelled': return 'text-warning-500';
			case 'failed': return 'text-error-500';
			case 'processing': return 'text-primary-500';
			default: return 'text-surface-500';
		}
	}

	function statusLabel(status: string): string {
		switch (status) {
			case 'completed': return m.BATCH_INVITEE_COMPLETED();
			case 'cancelled': return m.BATCH_INVITEE_CANCELLED();
			case 'failed': return m.BATCH_INVITEE_FAILED();
			case 'processing': return m.BATCH_INVITEE_PROCESSING();
			default: return status;
		}
	}
</script>

<div class="container mx-auto p-4 max-w-4xl">
	<header class="mb-6">
		<a href="/web/invite/invitees" class="btn btn-sm variant-ghost mb-4">
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
						<tr>
							<td>{formatDateTime(job.created_at)}</td>
							<td>
								<span class="flex items-center gap-1 {statusClass(job.status)}">
									<Fa icon={statusIcon(job.status)} class={job.status === 'processing' ? 'animate-spin' : ''} />
									{statusLabel(job.status)}
								</span>
							</td>
							<td>{job.role}</td>
							<td class="text-center">{job.total_rows}</td>
							<td class="text-center text-success-500">{job.successful_count}</td>
							<td class="text-center text-surface-500">{job.skipped_duplicate_email_count + job.skipped_active_user_count}</td>
							<td class="text-center text-error-500">{job.failed_count}</td>
							<td>
								<a href="/web/invite/batch-logs/{job.uid}" class="btn btn-sm variant-ghost-primary">
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

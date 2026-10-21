<script lang="ts">
	import Fa from 'svelte-fa';
	import { faArrowLeft, faEye } from '@fortawesome/free-solid-svg-icons';
	import * as m from '$msgs';
	import type { PageData } from './$types';
	import { base } from '$app/paths';
	import ListDateTime from '$lib/components/DateTime/ListDateTime.svelte';
	import { batchJobStatus } from '$lib/Invitee/batchJobStatus';
	import { resendCounts } from '$lib/Invitee/batchResend';

	let { data }: { data: PageData } = $props();
	let jobs = $derived(data.jobs ?? []);
</script>

<div class="container mx-auto p-4 max-w-4xl">
	<header class="mb-6">
		<a href="{base}/web/invite/invitees" class="btn min-h-11 variant-ghost mb-4">
			<Fa icon={faArrowLeft} class="mr-2" />
			{m.INVITEE_BACK_TO_LIST()}
		</a>
		<h1 class="h1 mb-2">{m.REMINDER_LOGS_TITLE()}</h1>
	</header>

	{#if jobs.length === 0}
		<div class="card p-6 text-center text-surface-500">
			<p>{m.REMINDER_LOGS_EMPTY()}</p>
		</div>
	{:else}
		<div class="table-container">
			<table class="table table-hover" data-testid="reminder-logs">
				<thead>
					<tr>
						<th>Date</th>
						<th>{m.BATCH_INVITEE_STATUS()}</th>
						<th class="text-center">Total</th>
						<th class="text-center">{m.BATCH_INVITEE_RESEND_SENT()}</th>
						<th class="text-center">{m.BATCH_INVITEE_RESEND_SKIPPED()}</th>
						<th class="text-center">{m.BATCH_INVITEE_EMAIL_ERRORS()}</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each jobs as job (job.uid)}
						{@const status = batchJobStatus(job.status, 'resend')}
						{@const counts = resendCounts(job)}
						<tr>
							<td><ListDateTime value={job.created_at} /></td>
							<td>
								<span class="flex items-center gap-1 {status.className}">
									<Fa icon={status.icon} class={job.status === 'processing' ? 'animate-spin' : ''} />
									{status.label}
								</span>
							</td>
							<td class="text-center">{job.total_rows}</td>
							<td class="text-center text-success-500">{counts.sent}</td>
							<td class="text-center text-surface-500">{counts.skipped}</td>
							<td class="text-center text-error-500">{counts.failed}</td>
							<td>
								<a
									href="{base}/web/invite/batch-logs/{job.uid}"
									class="btn-icon variant-ghost-primary"
									aria-label={m.INVITEE_RESEND_REPORT()}
									title={m.INVITEE_RESEND_REPORT()}
								>
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

<script lang="ts">
	import Fa from 'svelte-fa';
	import {
		faArrowLeft,
		faCheck,
		faXmark,
		faBan,
		faExclamationTriangle,
		faExternalLinkAlt
	} from '@fortawesome/free-solid-svg-icons';
	import * as m from '$msgs';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let job = $derived(data.job);

	function formatDateTime(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('fr-FR', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function statusBadgeClass(status: string): string {
		switch (status) {
			case 'created': return 'badge variant-filled-success';
			case 'warning_name_match': return 'badge variant-filled-warning';
			case 'skipped_duplicate_email':
			case 'skipped_active_user': return 'badge variant-filled-surface';
			case 'failed': return 'badge variant-filled-error';
			default: return 'badge variant-filled-surface';
		}
	}

	function statusLabel(status: string): string {
		switch (status) {
			case 'created': return m.BATCH_INVITEE_CREATED();
			case 'warning_name_match': return m.BATCH_INVITEE_WARNING_NAME();
			case 'skipped_duplicate_email': return m.BATCH_INVITEE_SKIPPED_DUPLICATE();
			case 'skipped_active_user': return m.BATCH_INVITEE_SKIPPED_ACTIVE();
			case 'failed': return m.BATCH_INVITEE_FAILED();
			default: return status;
		}
	}

	function jobStatusLabel(status: string): string {
		switch (status) {
			case 'completed': return m.BATCH_INVITEE_COMPLETED();
			case 'cancelled': return m.BATCH_INVITEE_CANCELLED();
			case 'failed': return m.BATCH_INVITEE_FAILED();
			default: return status;
		}
	}

	function jobStatusIcon(status: string) {
		switch (status) {
			case 'completed': return faCheck;
			case 'cancelled': return faBan;
			default: return faXmark;
		}
	}

	function jobStatusColor(status: string): string {
		switch (status) {
			case 'completed': return 'text-success-500';
			case 'cancelled': return 'text-warning-500';
			default: return 'text-error-500';
		}
	}
</script>

<div class="container mx-auto p-4 max-w-4xl">
	<header class="mb-6">
		<a href="/web/invite/batch-logs" class="btn btn-sm variant-ghost mb-4">
			<Fa icon={faArrowLeft} class="mr-2" />
			{m.BATCH_INVITEE_LOGS()}
		</a>

		{#if job}
			<div class="flex items-center gap-3 mb-2">
				<h1 class="h1">{m.BATCH_INVITEE_SUMMARY()}</h1>
				<span class={jobStatusColor(job.status)}>
					<Fa icon={jobStatusIcon(job.status)} />
					{jobStatusLabel(job.status)}
				</span>
			</div>
			<p class="text-surface-600">{formatDateTime(job.created_at)} — {m.INVITEE_COL_ROLE()}: {job.role}</p>
		{/if}
	</header>

	{#if !job}
		<div class="card p-6 text-center text-surface-500">
			<p>Job not found.</p>
		</div>
	{:else}
		<!-- Counters -->
		<div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
			<div class="card p-3 text-center variant-soft-success">
				<p class="text-2xl font-bold">{job.successful_count}</p>
				<p class="text-sm">{m.BATCH_INVITEE_CREATED()}</p>
			</div>
			<div class="card p-3 text-center variant-soft-error">
				<p class="text-2xl font-bold">{job.failed_count}</p>
				<p class="text-sm">{m.BATCH_INVITEE_FAILED()}</p>
			</div>
			<div class="card p-3 text-center variant-soft-surface">
				<p class="text-2xl font-bold">{job.skipped_duplicate_email_count}</p>
				<p class="text-sm">{m.BATCH_INVITEE_SKIPPED_DUPLICATE()}</p>
			</div>
			<div class="card p-3 text-center variant-soft-surface">
				<p class="text-2xl font-bold">{job.skipped_active_user_count}</p>
				<p class="text-sm">{m.BATCH_INVITEE_SKIPPED_ACTIVE()}</p>
			</div>
			{#if job.failed_email_count > 0}
				<div class="card p-3 text-center variant-soft-warning">
					<p class="text-2xl font-bold">{job.failed_email_count}</p>
					<p class="text-sm">{m.BATCH_INVITEE_EMAIL_ERRORS()}</p>
				</div>
			{/if}
			<div class="card p-3 text-center variant-soft-primary">
				<p class="text-2xl font-bold">{job.total_rows}</p>
				<p class="text-sm">Total</p>
			</div>
		</div>

		<!-- Summary table -->
		{#if job.summary?.length > 0}
			<div class="table-container">
				<table class="table table-compact">
					<thead>
						<tr>
							<th>{m.BATCH_INVITEE_ROW()}</th>
							<th>{m.INVITEE_COL_NAME()}</th>
							<th>{m.INVITEE_COL_EMAIL()}</th>
							<th>{m.BATCH_INVITEE_STATUS()}</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{#each job.summary as row}
							<tr>
								<td>{row.row}</td>
								<td>{row.name || '—'}</td>
								<td>{row.email}</td>
								<td>
									<span class={statusBadgeClass(row.status)}>
										{statusLabel(row.status)}
									</span>
									{#if row.email_error}
										<span class="badge variant-filled-warning ml-1" title={m.BATCH_INVITEE_EMAIL_ERRORS()}>
											<Fa icon={faExclamationTriangle} />
										</span>
									{/if}
								</td>
								<td>
									{#if row.existing_invitee_uid}
										<a
											href="/web/invite/invitees/{row.existing_invitee_uid}"
											target="_blank"
											rel="noopener noreferrer"
											class="btn btn-sm variant-ghost-warning"
											title={m.BATCH_INVITEE_VIEW_EXISTING()}
										>
											<Fa icon={faExternalLinkAlt} />
										</a>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}

		<!-- Actions -->
		<div class="flex gap-4 justify-end mt-6">
			<a href="/web/invite/invitees" class="btn variant-filled-primary">
				{m.BATCH_INVITEE_VIEW_INVITEES()}
			</a>
		</div>
	{/if}
</div>

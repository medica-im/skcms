<script lang="ts">
	import Fa from 'svelte-fa';
	import {
		faArrowLeft,
		faExclamationTriangle,
		faExternalLinkAlt
	} from '@fortawesome/free-solid-svg-icons';
	import { batchJobStatus } from '$lib/Invitee/batchJobStatus';
	import * as m from '$msgs';
	import type { PageData } from './$types';
	import { base } from '$app/paths';
	import InviteeEmailDelivery from '$lib/Invitee/InviteeEmailDelivery.svelte';
	import InviteeAddressFlag from '$lib/Invitee/InviteeAddressFlag.svelte';
	import { needsCheck } from '$lib/Invitee/inviteeFilter';
	import { resendCounts } from '$lib/Invitee/batchResend';
	import { deliveryLook, errorKindShort, NEEDS_ACTION, type DeliveryState } from '$lib/Invitee/emailDelivery';
	import type { EmailErrorKind } from '$lib/interfaces/v2/invitee';

	let { data }: { data: PageData } = $props();
	let job = $derived(data.job);
	// Where each email stands now (backend batch_report), not when the job ran.
	let emailStatusCounts = $derived(
		Object.entries(job?.email_status_counts ?? {}) as [DeliveryState, number][]
	);
	// A row as an invitation, for the address checks shared with the list.
	const asInvitee = (row: any) =>
		({
			uid: row.invitee_uid,
			email: row.email,
			emailDelivery: row.email_delivery,
			addressIssue: row.addressIssue,
			redeemedAt: null
		}) as never;
	let rowsToCheck = $derived((job?.summary ?? []).filter((row: any) => needsCheck(asInvitee(row))));
	let onlyToCheck = $state(false);
	let shownRows = $derived(onlyToCheck ? rowsToCheck : (job?.summary ?? []));
	let errorKindCounts = $derived(
		Object.entries(job?.email_error_kind_counts ?? {}) as [EmailErrorKind, number][]
	);

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

	// A reminder's rows: sent again, or why not (access.tasks._send_invitations).
	const SKIPPED_LABEL: Record<string, () => string> = {
		used: m.INVITEE_STATUS_USED,
		disabled: m.INVITEE_STATUS_DISABLED,
		already_queued: m.INVITEE_RESEND_REASON_QUEUED,
		missing: m.BATCH_INVITEE_ROW_MISSING
	};

	function rowLabel(row: any): string {
		if (row.status !== 'resend') return statusLabel(row.status);
		if (!row.email_skipped) return m.BATCH_INVITEE_ROW_RESENT();
		return SKIPPED_LABEL[row.email_skipped]?.() ?? row.email_skipped;
	}

	function rowBadgeClass(row: any): string {
		if (row.status !== 'resend') return statusBadgeClass(row.status);
		return row.email_skipped ? 'badge variant-filled-surface' : 'badge variant-filled-success';
	}

</script>

<div class="container mx-auto p-4 max-w-4xl">
	<header class="mb-6">
		{#if job?.kind === 'resend'}
			<a href="{base}/web/invite/reminder-logs" class="btn btn-sm variant-ghost mb-4">
				<Fa icon={faArrowLeft} class="mr-2" />
				{m.REMINDER_LOGS_TITLE()}
			</a>
		{:else}
			<a href="{base}/web/invite/batch-logs" class="btn btn-sm variant-ghost mb-4">
				<Fa icon={faArrowLeft} class="mr-2" />
				{m.BATCH_INVITEE_LOGS()}
			</a>
		{/if}

		{#if job}
			{@const status = batchJobStatus(job.status, job.kind)}
			<div class="flex items-center gap-3 mb-2">
				<h1 class="h1">{m.BATCH_INVITEE_SUMMARY()}</h1>
				<span class={status.className}>
					<Fa icon={status.icon} />
					{status.label}
				</span>
			</div>
			<p class="text-surface-600">
				{formatDateTime(job.created_at)} —
				{#if job.kind === 'resend'}{m.BATCH_INVITEE_KIND_RESEND()}{:else}{m.INVITEE_COL_ROLE()}: {job.role}{/if}
			</p>
		{/if}
	</header>

	{#if !job}
		<div class="card p-6 text-center text-surface-500">
			<p>Job not found.</p>
		</div>
	{:else}
		<!-- Counters -->
		{#if job.kind === 'resend'}
			{@const counts = resendCounts(job)}
			<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6" data-testid="resend-counts">
				<div class="card p-3 text-center variant-soft-success">
					<p class="text-2xl font-bold">{counts.sent}</p>
					<p class="text-sm">{m.BATCH_INVITEE_RESEND_SENT()}</p>
				</div>
				<div class="card p-3 text-center variant-soft-surface">
					<p class="text-2xl font-bold">{counts.skipped}</p>
					<p class="text-sm">{m.BATCH_INVITEE_RESEND_SKIPPED()}</p>
				</div>
				<div class="card p-3 text-center variant-soft-warning">
					<p class="text-2xl font-bold">{counts.failed}</p>
					<p class="text-sm">{m.BATCH_INVITEE_EMAIL_ERRORS()}</p>
				</div>
				<div class="card p-3 text-center variant-soft-primary">
					<p class="text-2xl font-bold">{job.total_rows}</p>
					<p class="text-sm">Total</p>
				</div>
			</div>
		{:else}
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
			{#if rowsToCheck.length > 0}
				<div class="card p-3 text-center variant-soft-warning" data-testid="batch-check-count">
					<p class="text-2xl font-bold">{rowsToCheck.length}</p>
					<p class="text-sm">{m.BATCH_INVITEE_CHECK_CARD()}</p>
				</div>
			{/if}
			<div class="card p-3 text-center variant-soft-primary">
				<p class="text-2xl font-bold">{job.total_rows}</p>
				<p class="text-sm">Total</p>
			</div>
		</div>
		{/if}

		{#if emailStatusCounts.length > 0}
			<section class="mb-6 space-y-3" data-testid="batch-email-counts">
				<h2 class="h4">{m.BATCH_INVITEE_EMAIL_STATUSES()}</h2>
				<ul class="flex flex-wrap gap-2">
					{#each emailStatusCounts as [state, count] (state)}
						<li
							class="badge {NEEDS_ACTION.has(state) ? 'variant-soft-error' : 'variant-soft-surface'} gap-2 text-sm"
							data-state={state}
						>
							<Fa icon={deliveryLook[state]?.icon ?? faExclamationTriangle} />
							<span>{deliveryLook[state]?.short() ?? state}</span>
							<span class="font-bold">{count}</span>
						</li>
					{/each}
				</ul>
				{#if errorKindCounts.length > 0}
					<h3 class="h5">{m.BATCH_INVITEE_EMAIL_FAILURE_KINDS()}</h3>
					<ul class="flex flex-wrap gap-2">
						{#each errorKindCounts as [kind, count] (kind)}
							<li class="badge variant-soft-error gap-2 text-sm" data-kind={kind}>
								<span>{errorKindShort[kind]?.() ?? kind}</span>
								<span class="font-bold">{count}</span>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		{/if}

		<!-- Summary table -->
		{#if job.summary?.length > 0}
			{#if rowsToCheck.length > 0}
				<label class="mb-3 flex min-h-11 items-center gap-3">
					<input type="checkbox" class="checkbox" bind:checked={onlyToCheck} />
					<span>{m.BATCH_INVITEE_CHECK_ONLY()}</span>
				</label>
			{/if}
			<div class="table-container">
				<table class="table table-compact">
					<thead>
						<tr>
							<th>{m.BATCH_INVITEE_ROW()}</th>
							<th>{m.INVITEE_COL_NAME()}</th>
							<th>{m.INVITEE_COL_EMAIL()}</th>
							<th>{m.BATCH_INVITEE_STATUS()}</th>
							<th>{m.BATCH_INVITEE_EMAIL_COLUMN_HEADER()}</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{#each shownRows as row}
							<tr>
								<td>{row.row}</td>
								<td>{row.name || '—'}</td>
								<td>
									<span class="inline-flex items-center gap-2">
										<span>{row.email}</span>
										<InviteeAddressFlag invitee={asInvitee(row)} />
									</span>
								</td>
								<td>
									<span class={rowBadgeClass(row)}>
										{rowLabel(row)}
									</span>
									{#if row.email_error && !row.email_delivery}
										<!-- A job from before deliveries were linked to it. -->
										<span class="badge variant-filled-warning ml-1" title={m.BATCH_INVITEE_EMAIL_ERRORS()}>
											<Fa icon={faExclamationTriangle} />
										</span>
									{/if}
								</td>
								<td>
									{#if row.email_delivery}
										<InviteeEmailDelivery
											delivery={row.email_delivery}
											variant="column"
											href={row.invitee_uid ? `${base}/web/invite/invitees/${row.invitee_uid}` : undefined}
										/>
									{/if}
								</td>
								<td>
									{#if row.existing_invitee_uid}
										<a
											href="{base}/web/invite/invitees/{row.existing_invitee_uid}"
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
			<a href="{base}/web/invite/invitees" class="btn variant-filled-primary">
				{job.kind === 'resend' ? m.INVITEE_BACK_TO_LIST() : m.BATCH_INVITEE_VIEW_INVITEES()}
			</a>
		</div>
	{/if}
</div>

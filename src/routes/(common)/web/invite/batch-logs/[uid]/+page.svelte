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
	import { base } from '$app/paths';
	import InviteeEmailDelivery from '$lib/Invitee/InviteeEmailDelivery.svelte';
	import InviteeAddressFlag from '$lib/Invitee/InviteeAddressFlag.svelte';
	import { needsCheck } from '$lib/Invitee/inviteeFilter';
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
		<a href="{base}/web/invite/batch-logs" class="btn btn-sm variant-ghost mb-4">
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
									<span class={statusBadgeClass(row.status)}>
										{statusLabel(row.status)}
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
				{m.BATCH_INVITEE_VIEW_INVITEES()}
			</a>
		</div>
	{/if}
</div>

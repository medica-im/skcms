<script lang="ts">
	import Fa from 'svelte-fa';
	import { faSpinner, faStop } from '@fortawesome/free-solid-svg-icons';
	import * as m from '$msgs';
	import { base } from '$app/paths';
	import { APP_URL } from '$lib/utils/appUrl';
	import { formatFullDateTime } from '$lib/utils/dateTimeFormat';
	import DismissibleAlert from '$lib/Alert/DismissibleAlert.svelte';
	import BatchProgressBar from './BatchProgressBar.svelte';
	import { isRunning, progressOf, resendCounts, type ResendJob } from './batchResend';
	import { getLocale } from '$prgld/runtime.js';

	let {
		job,
		pollMs = 1500,
		onfinished
	}: {
		job: ResendJob;
		pollMs?: number;
		onfinished?: () => void;
	} = $props();

	let current = $derived(job);
	const uid = $derived(current.uid);
	const running = $derived(isRunning(current));
	const date = $derived(formatFullDateTime(current.created_at, getLocale()) ?? '');
	let stopping = $state(false);

	async function poll() {
		try {
			const response = await fetch(`${APP_URL}/api/v2/batch-invitees/${uid}/progress`, {
				credentials: 'include'
			});
			if (!response.ok) return;
			const next: ResendJob = { ...current, ...(await response.json()) };
			current = next;
			if (!isRunning(next)) onfinished?.();
		} catch {
			// the next poll tries again
		}
	}

	$effect(() => {
		if (!running) return;
		const timer = setInterval(poll, pollMs);
		return () => clearInterval(timer);
	});

	async function stop() {
		stopping = true;
		try {
			const response = await fetch(`${APP_URL}/api/v2/batch-invitees/${uid}/cancel`, {
				method: 'POST',
				credentials: 'include'
			});
			if (!response.ok) stopping = false;
		} catch {
			stopping = false;
		}
	}
</script>

{#if running}
	<section class="card p-4 mb-4 space-y-3" data-testid="resend-running">
		<h2 class="h4 flex items-center gap-2">
			<Fa icon={faSpinner} class="animate-spin" />
			<span>{m.INVITEE_RESEND_RUNNING()}</span>
		</h2>
		<BatchProgressBar progress={progressOf(current)} />
		<div class="flex justify-end">
			<button type="button" class="btn min-h-11 variant-ghost-warning" disabled={stopping} onclick={stop}>
				<span><Fa icon={faStop} /></span>
				<span>{m.INVITEE_RESEND_STOP()}</span>
			</button>
		</div>
	</section>
{:else}
	<div class="[&:has(aside)]:mb-4">
		<DismissibleAlert
			id="resend-{uid}"
			confirmClose={false}
			variant={current.status === 'completed' ? 'variant-soft-success' : 'variant-soft-warning'}
		>
			<p data-testid="resend-summary">
				{#if current.status === 'completed'}
					{m.INVITEE_RESEND_SUMMARY({ date, ...resendCounts(current) })}
				{:else}
					{m.INVITEE_RESEND_STOPPED({ date, processed: current.emails_processed, total: current.emails_total })}
				{/if}
			</p>
			<a class="anchor" href="{base}/web/invite/batch-logs/{uid}">{m.INVITEE_RESEND_REPORT()}</a>
			<a class="anchor" href="{base}/web/invite/reminder-logs">{m.REMINDER_LOGS_TITLE()}</a>
		</DismissibleAlert>
	</div>
{/if}

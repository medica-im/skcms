/**
 * A reminder job as the invitation list follows it.
 * The rules and why: see batchResend.test.ts.
 */
import type { BatchPhase, BatchProgress } from './BatchProgressBar.svelte';

export type BatchStatus = 'pending' | 'processing' | 'completed' | 'cancelled' | 'failed';

export interface ResendJob {
	uid: string;
	status: BatchStatus;
	created_at: string;
	phase: BatchPhase;
	total_rows: number;
	processed_rows: number;
	emails_total: number;
	emails_processed: number;
	email_skipped_count: number;
	failed_email_count: number;
}

export const isRunning = (job: ResendJob) => job.status === 'pending' || job.status === 'processing';

export function resendCounts(job: Pick<ResendJob, 'emails_processed' | 'email_skipped_count' | 'failed_email_count'>) {
	const skipped = job.email_skipped_count;
	const failed = job.failed_email_count;
	return { sent: job.emails_processed - skipped - failed, skipped, failed };
}

export function progressOf(job: ResendJob): BatchProgress {
	const percentage = job.emails_total > 0 ? Math.round((job.emails_processed / job.emails_total) * 1000) / 10 : 0;
	return { ...job, phase: 'sending', percentage };
}

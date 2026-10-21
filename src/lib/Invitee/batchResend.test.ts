/**
 * A reminder job as the invitation list follows it.
 *
 * It runs on the server, so the list can be left and come back to: while it
 * runs the list shows its progress, once it has finished what came of it.
 * "Sent" is what the mail service took: the emails processed less the ones
 * skipped (used, deactivated, already on their way) and the ones that failed.
 */
import { describe, it, expect } from 'vitest';
import { isRunning, resendCounts, progressOf, type ResendJob } from './batchResend';

const job = (over: Partial<ResendJob> = {}): ResendJob => ({
	uid: 'j',
	status: 'completed',
	created_at: '2026-10-20T12:00:00Z',
	phase: 'sending',
	total_rows: 10,
	processed_rows: 0,
	emails_total: 10,
	emails_processed: 10,
	email_skipped_count: 2,
	failed_email_count: 1,
	...over
});

describe('isRunning', () => {
	it.each(['pending', 'processing'] as const)('is running while %s', (status) => {
		expect(isRunning(job({ status }))).toBe(true);
	});

	it.each(['completed', 'cancelled', 'failed'] as const)('has finished once %s', (status) => {
		expect(isRunning(job({ status }))).toBe(false);
	});
});

describe('resendCounts', () => {
	it('counts as sent what was neither skipped nor failed', () => {
		expect(resendCounts(job())).toEqual({ sent: 7, skipped: 2, failed: 1 });
	});

	it('counts only what was processed when stopped part way', () => {
		expect(resendCounts(job({ status: 'cancelled', emails_processed: 4, email_skipped_count: 1, failed_email_count: 0 })))
			.toEqual({ sent: 3, skipped: 1, failed: 0 });
	});
});

describe('progressOf', () => {
	it('follows the emails', () => {
		expect(progressOf(job({ status: 'processing', emails_processed: 4 })).percentage).toBe(40);
	});

	it('is at zero before the first email', () => {
		expect(progressOf(job({ status: 'pending', emails_total: 0, emails_processed: 0 })).percentage).toBe(0);
	});
});

/**
 * The latest reminder, on the invitation list.
 *
 * It runs on the server, so the list can be left and come back to: while it
 * runs the list shows its progress, with a way to stop it; once finished,
 * what came of it and the report, until the administrator closes the alert
 * (kept in the dismissed-alerts cookie under the job's id, so the next
 * reminder's alert shows again).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../app.postcss';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';

vi.mock('$app/state', () => ({ page: { data: { dismissedAlerts: [] } } }));

import BatchResendStatus from './BatchResendStatus.svelte';
import type { ResendJob } from './batchResend';

const job = (over: Partial<ResendJob> = {}): ResendJob => ({
	uid: 'job-1',
	status: 'processing',
	created_at: '2026-10-20T12:00:00Z',
	phase: 'sending',
	total_rows: 10,
	processed_rows: 0,
	emails_total: 10,
	emails_processed: 4,
	email_skipped_count: 0,
	failed_email_count: 0,
	...over
});

const answer = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('BatchResendStatus', () => {
	it('shows a running reminder as a progress bar, with a way to stop it', async () => {
		vi.stubGlobal('fetch', vi.fn(() => answer(job())));
		render(BatchResendStatus, { job: job(), pollMs: 60_000 });

		await expect.element(page.getByText('Relance en cours')).toBeVisible();
		await expect.element(page.getByTestId('batch-progress-count')).toHaveTextContent('4 / 10 (40%)');
		await expect.element(page.getByRole('button', { name: 'Arrêter l’envoi' })).toBeVisible();
	});

	it('follows the reminder until it has finished, then says so', async () => {
		vi.stubGlobal('fetch', vi.fn(() => answer({ ...job(), status: 'completed', emails_processed: 10, email_skipped_count: 2, failed_email_count: 1 })));
		const onfinished = vi.fn();
		render(BatchResendStatus, { job: job(), pollMs: 10, onfinished });

		await expect.element(page.getByTestId('resend-summary')).toHaveTextContent('envoyés : 7 · ignorés : 2 · en échec : 1');
		expect(onfinished).toHaveBeenCalledOnce();
		expect(fetch).toHaveBeenCalledWith(expect.stringMatching(/\/api\/v2\/batch-invitees\/job-1\/progress$/), expect.anything());
	});

	it('asks the server to stop', async () => {
		vi.stubGlobal('fetch', vi.fn(() => answer({})));
		render(BatchResendStatus, { job: job(), pollMs: 60_000 });

		await page.getByRole('button', { name: 'Arrêter l’envoi' }).click();

		expect(fetch).toHaveBeenCalledWith(
			expect.stringMatching(/\/api\/v2\/batch-invitees\/job-1\/cancel$/),
			expect.objectContaining({ method: 'POST' })
		);
	});

	it('shows a finished reminder with its report', async () => {
		vi.stubGlobal('fetch', vi.fn());
		render(BatchResendStatus, {
			job: job({ status: 'completed', emails_processed: 10, email_skipped_count: 2, failed_email_count: 1 })
		});

		await expect.element(page.getByTestId('resend-summary')).toHaveTextContent('envoyés : 7 · ignorés : 2 · en échec : 1');
		await expect.element(page.getByRole('link', { name: 'Voir le rapport' })).toHaveAttribute(
			'href',
			expect.stringMatching(/\/web\/invite\/batch-logs\/job-1$/)
		);
		expect(fetch).not.toHaveBeenCalled();
	});

	it('leads to the history of the reminders', async () => {
		render(BatchResendStatus, { job: job({ status: 'completed', emails_processed: 10 }) });

		await expect.element(page.getByRole('link', { name: 'Historique des relances' })).toHaveAttribute(
			'href',
			expect.stringMatching(/\/web\/invite\/reminder-logs$/)
		);
	});

	it('says where a stopped reminder got to', async () => {
		render(BatchResendStatus, { job: job({ status: 'cancelled', emails_processed: 4 }) });

		await expect.element(page.getByTestId('resend-summary')).toHaveTextContent('arrêtée après 4 e-mails sur 10');
	});
});

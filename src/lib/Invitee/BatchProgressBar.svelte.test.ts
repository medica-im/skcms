/**
 * A batch job's progress: which step it is in, and how far that step got.
 *
 * An import creates every invitation before the first email goes, so a bar
 * counting rows would sit at 100% for the whole sending. The bar follows the
 * step: rows while creating, emails while sending.
 */
import { describe, it, expect } from 'vitest';
import '../../app.postcss';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import BatchProgressBar from './BatchProgressBar.svelte';

const base = {
	total_rows: 4,
	processed_rows: 4,
	emails_total: 4,
	emails_processed: 0,
	percentage: 0
};

describe('BatchProgressBar', () => {
	it('counts the rows while the invitations are being created', async () => {
		render(BatchProgressBar, {
			progress: { ...base, phase: 'creating', processed_rows: 2, percentage: 50 }
		});
		await expect.element(page.getByText('Création des invitations')).toBeVisible();
		await expect.element(page.getByTestId('batch-progress-count')).toHaveTextContent('2 / 4 (50%)');
	});

	it('counts the emails once they are being sent', async () => {
		render(BatchProgressBar, {
			progress: { ...base, phase: 'sending', emails_processed: 1, percentage: 25 }
		});
		await expect.element(page.getByText('Envoi des e-mails')).toBeVisible();
		await expect.element(page.getByTestId('batch-progress-count')).toHaveTextContent('1 / 4 (25%)');
	});

	it('fills the bar to the percentage', async () => {
		render(BatchProgressBar, {
			progress: { ...base, phase: 'sending', emails_processed: 1, percentage: 25 }
		});
		await expect.element(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25');
	});
});

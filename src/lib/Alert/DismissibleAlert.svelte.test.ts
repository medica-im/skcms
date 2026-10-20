/**
 * An alert the visitor can close for good. Closing it is kept in a cookie the
 * server reads, so an alert already closed is never rendered, on the server
 * or after hydration, and the page does not move when it loads.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../app.postcss';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { createRawSnippet } from 'svelte';

vi.mock('$app/state', () => ({ page: { data: { dismissedAlerts: ['closed-before'] } } }));

import DismissibleAlert from './DismissibleAlert.svelte';

const children = createRawSnippet(() => ({ render: () => '<span>Les inscriptions sont ouvertes.</span>' }));

afterEach(() => {
	document.cookie = 'dismissed-alerts=; Path=/; Max-Age=0';
	vi.restoreAllMocks();
});

describe('DismissibleAlert', () => {
	it('is not rendered when the visitor closed it before', async () => {
		render(DismissibleAlert, { id: 'closed-before', children });

		await expect.element(page.getByText('Les inscriptions sont ouvertes.')).not.toBeInTheDocument();
	});

	it('is shown until closed, and closing it is kept in the cookie the server reads', async () => {
		vi.spyOn(window, 'confirm').mockReturnValue(true);
		render(DismissibleAlert, { id: 'association-alert-v1', children });
		await expect.element(page.getByText('Les inscriptions sont ouvertes.')).toBeVisible();

		await page.getByRole('button', { name: 'Fermer' }).click();

		await expect.element(page.getByText('Les inscriptions sont ouvertes.')).not.toBeInTheDocument();
		expect(document.cookie).toContain('dismissed-alerts=closed-before,association-alert-v1');
	});
});

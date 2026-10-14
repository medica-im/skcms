/**
 * People who take part in a programme without an entry in the directory.
 */
import { describe, it, expect } from 'vitest';
import '../../app.postcss';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import FreeEntryUl from './FreeEntryUl.svelte';

describe('FreeEntryUl', () => {
	it('shows each person as "name, occupation"', async () => {
		render(FreeEntryUl, {
			data: [
				{ name: 'Marie Durand', occupation: 'diététicienne' },
				{ name: 'Paul Martin', occupation: 'éducateur sportif' }
			]
		});
		await expect.element(page.getByText('Marie Durand, diététicienne')).toBeInTheDocument();
		await expect.element(page.getByText('Paul Martin, éducateur sportif')).toBeInTheDocument();
	});

	it('links a person who has a url to it', async () => {
		render(FreeEntryUl, {
			data: [{ name: 'Marie Durand', occupation: 'diététicienne', url: 'https://example.org/md' }]
		});
		await expect
			.element(page.getByRole('link', { name: /Marie Durand/ }))
			.toHaveAttribute('href', 'https://example.org/md');
	});

	it('does not make a person without a url a link', async () => {
		render(FreeEntryUl, { data: [{ name: 'Paul Martin', occupation: 'éducateur sportif' }] });
		await expect.element(page.getByText('Paul Martin, éducateur sportif')).toBeInTheDocument();
		expect(page.getByRole('link').elements()).toHaveLength(0);
	});
});

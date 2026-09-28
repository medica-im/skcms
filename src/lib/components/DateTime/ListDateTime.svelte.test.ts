/**
 * A date in an ordered list: readable text (see formatListDateTime), the exact
 * moment on hover, and a machine-readable <time datetime>.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import ListDateTime from './ListDateTime.svelte';

describe('ListDateTime', () => {
	it('shows the readable form, with the exact moment as its tooltip', async () => {
		const value = Date.now() - 5 * 60_000;
		render(ListDateTime, { value });
		const text = page.getByText(/il y a 5 minutes|5 minutes ago/i);
		await expect.element(text).toBeVisible();
		const time = text.element().closest('time')!;
		expect(time.getAttribute('datetime')).toBe(new Date(value).toISOString());
		expect(time.getAttribute('title')).toMatch(/2\d{3}/);
	});

	it('shows a dash when there is no date', async () => {
		render(ListDateTime, { value: null });
		await expect.element(page.getByText('—')).toBeVisible();
		expect(document.querySelector('time')).toBeNull();
	});
});

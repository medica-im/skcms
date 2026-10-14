/**
 * The mark beside a programme that has ended but is kept for reference.
 */
import { describe, it, expect } from 'vitest';
import '../../app.postcss';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import ArchiveBadge from './ArchiveBadge.svelte';

describe('ArchiveBadge', () => {
	it('is announced as "Archivé"', async () => {
		render(ArchiveBadge);
		await expect.element(page.getByRole('img', { name: 'Archivé' })).toBeVisible();
	});

	it('shows an icon and no text', async () => {
		render(ArchiveBadge);
		const badge = page.getByRole('img', { name: 'Archivé' });
		await expect.element(badge).toBeVisible();
		expect(badge.element().querySelector('svg')).not.toBeNull();
		expect(badge.element().textContent?.trim()).toBe('');
	});
});

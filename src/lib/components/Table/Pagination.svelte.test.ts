/**
 * Paging a long list: where you are, the pages either side, and how many
 * rows a page holds.
 *
 * Users average 50+, so every control is a 44px target, not Skeleton's 32px
 * btn-sm. A list that fits on one page shows no paging at all.
 */
import { describe, it, expect, vi } from 'vitest';
import '../../../app.postcss';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import Pagination from './Pagination.svelte';

const props = (over = {}) => ({
	page: 2,
	pages: 3,
	size: 50,
	total: 120,
	onpage: vi.fn(),
	onsize: vi.fn(),
	...over
});

const previous = () => page.getByRole('button', { name: 'Précédent' });
const next = () => page.getByRole('button', { name: 'Suivant' });

describe('Pagination', () => {
	it('says which page this is', async () => {
		render(Pagination, props());
		await expect.element(page.getByText('Page 2 / 3')).toBeVisible();
	});

	it('moves one page either way', async () => {
		const p = props();
		render(Pagination, p);
		await next().click();
		expect(p.onpage).toHaveBeenLastCalledWith(3);
		await previous().click();
		expect(p.onpage).toHaveBeenLastCalledWith(1);
	});

	it('has no page before the first', async () => {
		render(Pagination, props({ page: 1 }));
		await expect.element(previous()).toBeDisabled();
	});

	it('has no page after the last', async () => {
		render(Pagination, props({ page: 3 }));
		await expect.element(next()).toBeDisabled();
	});

	it('holds 50 or 100 rows a page', async () => {
		const p = props();
		render(Pagination, p);
		const select = page.getByRole('combobox', { name: 'Par page' });
		await select.selectOptions('100');
		expect(p.onsize).toHaveBeenCalledWith(100);
	});

	it('makes every control a 44px target', async () => {
		render(Pagination, props());
		for (const control of [previous(), next(), page.getByRole('combobox', { name: 'Par page' })]) {
			const height = (control.element() as HTMLElement).getBoundingClientRect().height;
			expect(height).toBeGreaterThanOrEqual(44);
		}
	});

	it('shows nothing when the list fits on one page', async () => {
		render(Pagination, props({ page: 1, pages: 1, total: 40 }));
		await expect.element(page.getByTestId('pagination')).not.toBeInTheDocument();
	});
});

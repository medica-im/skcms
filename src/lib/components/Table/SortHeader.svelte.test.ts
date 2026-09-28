/**
 * The header of a sortable column.
 *
 * It replaced a grey label with a "↓" that only appeared once the column was
 * sorted: too small to see, and nothing said the other columns could be
 * sorted at all. The convention now (GOV.UK, Carbon, Material alike): the
 * whole label is a button that looks like one, every sortable column shows a
 * sort icon -- faded until it is the active one -- and the active column's
 * icon points the way it is sorted. 44px tall, for older users on phones.
 */
import { describe, it, expect, vi } from 'vitest';
// The component project loads no stylesheet, so without this Tailwind's
// min-h-11 does not exist and the 44px check measures bare text.
import '../../../app.postcss';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import SortHeader from './SortHeader.svelte';
import { ariaSort } from './sortHeader';

const icon = () => page.getByTestId('sort-icon');

describe('SortHeader', () => {
	it('is a button named by its label, at least 44px tall', async () => {
		render(SortHeader, { label: 'Création', active: false, direction: 'desc', onclick: () => {} });
		const button = page.getByRole('button', { name: 'Création' });
		await expect.element(button).toBeVisible();
		expect(button.element().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
	});

	it('shows a faded sort icon on a column that is not the one sorted', async () => {
		render(SortHeader, { label: 'Nom', active: false, direction: 'asc', onclick: () => {} });
		await expect.element(icon()).toHaveAttribute('data-direction', 'none');
		await expect.element(icon()).toHaveClass(/opacity-40/);
	});

	it('points the icon down when the active column is sorted descending', async () => {
		render(SortHeader, { label: 'Création', active: true, direction: 'desc', onclick: () => {} });
		await expect.element(icon()).toHaveAttribute('data-direction', 'desc');
		await expect.element(icon()).not.toHaveClass(/opacity-40/);
	});

	it('points the icon up when the active column is sorted ascending', async () => {
		render(SortHeader, { label: 'Création', active: true, direction: 'asc', onclick: () => {} });
		await expect.element(icon()).toHaveAttribute('data-direction', 'asc');
	});

	it('calls onclick when pressed', async () => {
		const onclick = vi.fn();
		render(SortHeader, { label: 'Création', active: true, direction: 'desc', onclick });
		await page.getByRole('button', { name: 'Création' }).click();
		expect(onclick).toHaveBeenCalledOnce();
	});
});

describe('ariaSort', () => {
	// For the header CELL (th or role="columnheader"), which the parent owns.
	it('describes the active column, and "none" for the others', () => {
		expect(ariaSort(true, 'asc')).toBe('ascending');
		expect(ariaSort(true, 'desc')).toBe('descending');
		expect(ariaSort(false, 'desc')).toBe('none');
	});
});

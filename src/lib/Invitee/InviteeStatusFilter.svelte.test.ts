/**
 * The status filter above the invitations list: one button per status, each
 * with its count, the chosen one pressed. Same on every screen size -- a
 * four-way choice is one tap, never a menu. "Désactivées" only appears when
 * there is one (or when it is the current choice, so it can be undone).
 */
import { describe, it, expect, vi } from 'vitest';
import '../../app.postcss';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import InviteeStatusFilter from './InviteeStatusFilter.svelte';

const counts = { all: 12, active: 8, used: 3, disabled: 1 };

describe('InviteeStatusFilter', () => {
	it('offers each status with its count, in a labelled group', async () => {
		render(InviteeStatusFilter, { value: 'all', counts, onchange: () => {} });
		const group = page.getByRole('group', { name: 'Filtrer par statut' });
		await expect.element(group).toBeVisible();
		for (const [label, count] of [['Toutes', 12], ['Actives', 8], ['Utilisées', 3], ['Désactivées', 1]] as const) {
			await expect.element(group.getByRole('button', { name: `${label} ${count}` })).toBeVisible();
		}
	});

	it('marks the current choice as pressed, and only it', async () => {
		render(InviteeStatusFilter, { value: 'used', counts, onchange: () => {} });
		await expect.element(page.getByRole('button', { name: /^Utilisées/ })).toHaveAttribute('aria-pressed', 'true');
		await expect.element(page.getByRole('button', { name: /^Toutes/ })).toHaveAttribute('aria-pressed', 'false');
	});

	it('reports the status chosen', async () => {
		const onchange = vi.fn();
		render(InviteeStatusFilter, { value: 'all', counts, onchange });
		await page.getByRole('button', { name: /^Actives/ }).click();
		expect(onchange).toHaveBeenCalledWith('active');
	});

	it('leaves out "Désactivées" when there is none', async () => {
		render(InviteeStatusFilter, { value: 'all', counts: { ...counts, disabled: 0 }, onchange: () => {} });
		await expect.element(page.getByRole('button', { name: /^Actives/ })).toBeVisible();
		expect(page.getByRole('button', { name: /^Désactivées/ }).elements()).toHaveLength(0);
	});

	it('keeps "Désactivées" while it is the current choice, so it can be undone', async () => {
		render(InviteeStatusFilter, { value: 'disabled', counts: { ...counts, disabled: 0 }, onchange: () => {} });
		await expect.element(page.getByRole('button', { name: /^Désactivées/ })).toBeVisible();
	});

	it('gives every button a 44px target', async () => {
		render(InviteeStatusFilter, { value: 'all', counts, onchange: () => {} });
		const button = page.getByRole('button', { name: /^Toutes/ });
		await expect.element(button).toBeVisible();
		expect(button.element().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
	});
});

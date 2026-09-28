/**
 * An invitation's status: can it still be used?
 *
 * It used to be told by dimming a used invitation's whole row to 50% opacity,
 * which made it hard to read, and by a small green or grey dot -- colour alone,
 * lost on a colour-blind reader. Each state now differs by SHAPE (a filled
 * disc for the one that still works, a hollow ring for the others), by ICON
 * and by WORD, so any one of the three is enough.
 */
import { describe, it, expect } from 'vitest';
import '../../app.postcss';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import InviteeStatus from './InviteeStatus.svelte';

const badge = () => page.getByTestId('invitee-status');

describe('InviteeStatus', () => {
	it('shows an unused, active invitation as a filled disc, "Active"', async () => {
		render(InviteeStatus, { active: true, redeemedAt: null });
		await expect.element(badge()).toHaveAttribute('data-state', 'active');
		await expect.element(badge()).toHaveTextContent('Active');
		await expect.element(page.getByTestId('status-shape')).toHaveAttribute('data-shape', 'filled');
	});

	it('shows a used invitation as a hollow ring, "Utilisée"', async () => {
		render(InviteeStatus, { active: true, redeemedAt: Date.now() - 3_600_000 });
		await expect.element(badge()).toHaveAttribute('data-state', 'used');
		await expect.element(badge()).toHaveTextContent('Utilisée');
		await expect.element(page.getByTestId('status-shape')).toHaveAttribute('data-shape', 'hollow');
	});

	it('shows a deactivated, never used invitation as a hollow ring, "Désactivée"', async () => {
		render(InviteeStatus, { active: false, redeemedAt: null });
		await expect.element(badge()).toHaveAttribute('data-state', 'disabled');
		await expect.element(badge()).toHaveTextContent('Désactivée');
		await expect.element(page.getByTestId('status-shape')).toHaveAttribute('data-shape', 'hollow');
	});

	it('keeps a used invitation fully readable', async () => {
		render(InviteeStatus, { active: true, redeemedAt: Date.now() });
		const style = getComputedStyle(badge().element());
		expect(Number(style.opacity)).toBe(1);
	});
});

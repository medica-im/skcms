import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import RoleBadge from './RoleBadge.svelte';
import { roleLabels, roleShortLabels } from './roles';

/**
 * The role badge.
 *
 * A badge shows the *short* label because it has to fit in a `badge-sm` next
 * to a name and an email — "Utilisateur enregistré" there wraps to two lines
 * or pushes the card wider than its neighbours. But an abbreviation is only
 * safe if the full wording is still reachable, so the badge carries the long
 * label as its tooltip.
 *
 * That pairing is the reason this is a component rather than three lines of
 * markup: short label, badge colour and tooltip have to agree, and they were
 * previously copy-pasted into six places. The last time these maps were
 * duplicated they drifted — the backend's own copy still says "Équipe" where
 * the UI says "Équipier".
 */
describe('RoleBadge', () => {
	it('shows the short label', async () => {
		render(RoleBadge, { role: 'registered' });
		await expect.element(page.getByText(roleShortLabels.registered)).toBeVisible();
	});

	it('carries the full label as a tooltip', async () => {
		render(RoleBadge, { role: 'registered' });
		// title, not a Skeleton popup: a tooltip whose only job is to expand an
		// abbreviation should work on a keyboard and for a screen reader, and
		// should not need a store initialised in a layout to render at all.
		const badge = page.getByTitle(roleLabels.registered);
		await expect.element(badge).toBeVisible();
	});

	it('colours the badge by role', async () => {
		render(RoleBadge, { role: 'superuser' });
		const badge = page.getByTitle(roleLabels.superuser);
		await expect.element(badge).toHaveClass(/variant-filled-error/);
	});

	it('falls back to the raw name for a role it does not know', async () => {
		// The API can hand us a role this build has never heard of. Showing the
		// raw string is ugly but honest; showing nothing looks like the user
		// has no role at all.
		render(RoleBadge, { role: 'wizard' });
		await expect.element(page.getByText('wizard')).toBeVisible();
	});

	it('can show the full label inline where there is room', async () => {
		// Selects and detail rows have space, and the abbreviation helps nobody
		// there.
		render(RoleBadge, { role: 'registered', full: true });
		await expect.element(page.getByText(roleLabels.registered)).toBeVisible();
	});

	it('announces the full label to a screen reader', async () => {
		// title is a mouse affordance: it needs hover, so it does not exist on a
		// phone and is inconsistently announced. The accessible name has to
		// carry the full wording independently, or the abbreviation is all some
		// users ever get.
		render(RoleBadge, { role: 'registered' });
		await expect
			.element(page.getByLabelText(roleLabels.registered))
			.toBeVisible();
	});

	it('does not repeat itself when it already shows the full label', async () => {
		// A tooltip and an accessible name identical to the visible text are
		// noise: a screen reader reads it twice, and a long-press on a phone
		// reveals what is already on screen.
		render(RoleBadge, { role: 'registered', full: true });
		const badge = page.getByText(roleLabels.registered);
		await expect.element(badge).not.toHaveAttribute('title');
	});

	// The two below assert classes rather than measured widths, and that is a
	// real limit worth stating: this project mounts components without the
	// application stylesheet, so Tailwind's utilities are inert strings here and
	// `getComputedStyle` reports `display: inline, min-width: 0px` however the
	// badge is marked up. Measuring width in this environment tests nothing.
	//
	// What these can still catch is the mistake that actually happened: asking
	// for a uniform width with `min-w-*` alone, which does nothing to an inline
	// box. If the layout itself needs proving, it belongs in a Playwright test
	// against a real page.
	it('takes a uniform width so badges line up in a column', async () => {
		// The card layouts put the badge in a fixed grid track, but `w-fit`
		// shrink-wraps each one to its own text — so the coloured blocks start
		// at the same x and end at five different ones.
		const { container } = await render(RoleBadge, {
			role: 'anonymous',
			uniform: true
		});
		const badge = container.querySelector('span.badge') as HTMLElement;

		expect(badge.className).toContain('min-w-[9ch]');
		// Without this the min-width is ignored: `.badge` computes to
		// `display: inline`.
		expect(badge.className).toContain('inline-flex');
		expect(badge.className).not.toContain('w-fit');
	});

	it('shrink-wraps by default', async () => {
		// Inline use — a badge after a name in a flex row — should not leave a
		// gap where a longer role's text would have gone.
		const { container } = await render(RoleBadge, { role: 'anonymous' });
		const badge = container.querySelector('span.badge') as HTMLElement;

		expect(badge.className).toContain('w-fit');
		expect(badge.className).not.toContain('min-w-[9ch]');
	});
});

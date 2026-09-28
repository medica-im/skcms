/**
 * An invitation in the list, on a narrow (phone) screen.
 *
 * It used to stack seven rows per invitation -- avatar, name, email, a
 * full-width role bar, the date, a ✕ for "not used yet", the status, the
 * buttons -- so a phone showed barely two. It is now a list item in the
 * Material sense: who (name and a compact role chip), how to reach them
 * (email), what state (status and dates), with the actions in a column at
 * the trailing edge and the name itself leading to the detail.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '../../app.postcss';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';

vi.mock('$app/state', () => ({ page: { data: { user: { role: 'superuser' } } } }));
vi.mock('$app/paths', () => ({ base: '' }));

import Invitee from './Invitee.svelte';
import type { Invitee as InviteeData } from '$lib/interfaces/v2/invitee';

const base: InviteeData = {
	uid: 'inv-1',
	email: 'camille.martin@example.org',
	name: 'Camille Martin',
	role: 'staff',
	createdAt: new Date(Date.now() - 4 * 60_000).toISOString(),
	createdBy: 'user-1',
	active: true,
	redeemedAt: null
};

const card = () => page.getByTestId('invitee-card-compact');
const box = (locator: { element(): Element }) => locator.element().getBoundingClientRect();

beforeEach(async () => {
	await page.viewport(390, 844);
});

describe('an invitation on a narrow screen', () => {
	it('fits in three lines of text beside its actions', async () => {
		render(Invitee, { invitee: base, onEdit: () => {}, onDelete: () => {} });
		await expect.element(card()).toBeVisible();
		expect(box(card()).height).toBeLessThanOrEqual(130);
	});

	it('puts the actions in a column at the trailing edge, 44px each', async () => {
		render(Invitee, { invitee: base, onEdit: () => {}, onDelete: () => {} });
		const name = card().getByText('Camille Martin');
		for (const label of ['Modifier', 'Supprimer']) {
			const button = card().getByRole('button', { name: label });
			await expect.element(button).toBeVisible();
			expect(box(button).height).toBeGreaterThanOrEqual(44);
			expect(box(button).left).toBeGreaterThan(box(name).right);
		}
	});

	it('shows the role as a compact chip, not a full-width bar', async () => {
		render(Invitee, { invitee: base });
		const role = card().getByText('Équipier');
		await expect.element(role).toBeVisible();
		expect(box(role).width).toBeLessThan(box(card()).width / 3);
	});

	it('labels the creation date, the column headers being hidden', async () => {
		render(Invitee, { invitee: base });
		await expect.element(card().getByText(/Création/)).toBeVisible();
		await expect.element(card().getByText(/il y a 4 minutes/i)).toBeVisible();
	});

	it('says "Active" for an unused invitation, with no ✕ beside it', async () => {
		render(Invitee, { invitee: base });
		await expect.element(card().getByText('Active')).toBeVisible();
		expect(card().element().querySelector('[data-icon="xmark"]')).toBeNull();
	});

	it('gives a used invitation its use date in the status, and no actions', async () => {
		render(Invitee, {
			invitee: { ...base, redeemedAt: Date.now() - 30 * 60_000 },
			onEdit: () => {},
			onDelete: () => {}
		});
		await expect.element(card().getByText('Utilisée')).toBeVisible();
		await expect.element(card().getByText(/il y a 30 minutes/i)).toBeVisible();
		expect(card().getByRole('button', { name: 'Modifier' }).elements()).toHaveLength(0);
	});

	it('leads to the detail from the name', async () => {
		render(Invitee, { invitee: base });
		await expect
			.element(card().getByRole('link', { name: 'Camille Martin' }))
			.toHaveAttribute('href', '/web/invite/invitees/inv-1');
	});
});

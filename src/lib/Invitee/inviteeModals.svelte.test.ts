/**
 * Editing and deleting an invitation, from the list and from its own page.
 *
 * Both open a shallow-routed dialog over the page, and leave it by navigating
 * to the list of invitations. SvelteKit 3's goto is asynchronous and rejects
 * for a URL outside the app, so the dialog must open once goto has settled,
 * and every URL must go through the base path (the app is served under
 * /annuaire on unipa).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '../../app.postcss';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { goto } from '$app/navigation';
import { testPageState } from '../EffectorType/testState.svelte.ts';
import type { Invitee } from '#lib/interfaces/v2/invitee.ts';

vi.mock('$src/invitee.remote.ts', async () => {
	const { fakeRemoteForm } = await import('../test-fake-form.ts');
	const form = fakeRemoteForm();
	return {
		updateInvitee: { for: () => form },
		deleteInvitee: { for: () => form },
		createInvitee: { for: () => form }
	};
});

vi.mock('$app/paths', () => ({
	resolve: (path: string) => `/annuaire/${path}`,
	base: () => '/annuaire'
}));

vi.mock('$app/state', () => ({
	get page() {
		return {
			get state() {
				return testPageState.state;
			},
			url: new URL('http://localhost/annuaire/web/invite/invitees'),
			data: {}
		};
	}
}));

vi.mock('$app/navigation', () => ({
	preloadData: vi.fn(async (href: string) => {
		if (!href.startsWith('/annuaire/')) {
			throw new Error(`Attempted to preload a URL that does not belong to this app: ${href}`);
		}
		return { type: 'loaded' as const, status: 200, data: { session: null } };
	}),
	goto: vi.fn(async (href: string, opts?: { shallow?: boolean; state?: Record<string, unknown> }) => {
		if (!href.startsWith('/annuaire/')) {
			throw new Error(`Attempted to navigate to a URL that does not belong to this app: ${href}`);
		}
		await new Promise((r) => setTimeout(r, 10));
		if (opts?.shallow) testPageState.setState(opts.state ?? {});
		else testPageState.reset();
	})
}));

import EditInviteeModal from './EditInviteeModal.svelte';
import DeleteInviteeModal from './DeleteInviteeModal.svelte';

const invitee: Invitee = {
	uid: 'inv-1',
	email: 'camille.martin@example.org',
	name: 'Camille Martin',
	role: 'staff',
	createdAt: new Date().toISOString(),
	createdBy: 'user-1',
	active: true,
	redeemedAt: null
};

const LIST = '/annuaire/web/invite/invitees';

beforeEach(() => {
	testPageState.reset();
	vi.mocked(goto).mockClear();
});

describe('editing an invitation', () => {
	const editTitle = () => page.getByRole('heading', { name: "Modifier l'invitation" });

	it('has opened its dialog by the time handleEdit settles', async () => {
		const { component } = await render(EditInviteeModal);

		await component.handleEdit(invitee);

		expect(testPageState.state.editing).toBeDefined();
		await expect.element(editTitle()).toBeVisible();
	});

	it('goes to the update page through the base path', async () => {
		const { component } = await render(EditInviteeModal);

		await component.handleEdit(invitee);

		expect(goto).toHaveBeenCalledWith(
			'/annuaire/web/invite/update',
			expect.objectContaining({ shallow: true })
		);
	});

	it('closes the dialog and returns to the list of invitations on Cancel', async () => {
		const { component } = await render(EditInviteeModal);
		await component.handleEdit(invitee);
		await expect.element(editTitle()).toBeVisible();
		vi.mocked(goto).mockClear();

		await page.getByRole('button', { name: 'Annuler' }).click();

		expect(goto).toHaveBeenCalledWith(LIST);
		await expect.element(editTitle()).not.toBeInTheDocument();
	});
});

describe('deleting an invitation', () => {
	const deleteTitle = () => page.getByRole('heading', { name: "Supprimer l'invitation" });

	it('has opened its dialog by the time handleDelete settles', async () => {
		const { component } = await render(DeleteInviteeModal);

		await component.handleDelete(invitee);

		expect(testPageState.state.deleting).toBeDefined();
		await expect.element(deleteTitle()).toBeVisible();
	});

	it('goes to the delete page through the base path', async () => {
		const { component } = await render(DeleteInviteeModal);

		await component.handleDelete(invitee);

		expect(goto).toHaveBeenCalledWith(
			'/annuaire/web/invite/delete',
			expect.objectContaining({ shallow: true })
		);
	});

	it('closes the dialog and returns to the list of invitations on Cancel', async () => {
		const { component } = await render(DeleteInviteeModal);
		await component.handleDelete(invitee);
		await expect.element(deleteTitle()).toBeVisible();
		vi.mocked(goto).mockClear();

		await page.getByRole('button', { name: 'Annuler' }).click();

		expect(goto).toHaveBeenCalledWith(LIST);
		await expect.element(deleteTitle()).not.toBeInTheDocument();
	});
});

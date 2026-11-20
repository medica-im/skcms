/**
 * The dialogs that confirm deleting a contact detail of an entry.
 *
 * Each is a trigger button and a native <dialog> opened with showModal(). It
 * must open when asked, and leave the page as it was when the person cancels.
 */
import { describe, it, expect, vi } from 'vitest';
import '../../app.postcss';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import type { Component } from 'svelte';

vi.mock('$app/navigation', () => ({ invalidate: vi.fn(), goto: vi.fn() }));
vi.mock('@skeletonlabs/skeleton', async (importOriginal) => ({
	...(await importOriginal<typeof import('@skeletonlabs/skeleton')>()),
	getDrawerStore: () => ({ open: () => {}, close: () => {} })
}));
vi.mock('$app/state', () => ({ page: { url: new URL('http://localhost/e/x'), data: {} } }));

const { remote } = vi.hoisted(() => ({
	remote:
		(...names: string[]) =>
		async () => {
			const { fakeRemoteForm } = await import('../test-fake-form.ts');
			const form = fakeRemoteForm();
			return Object.fromEntries(names.map((name) => [name, { for: () => form }]));
		}
}));
vi.mock('../../phone.remote', remote('createPhone', 'updatePhone', 'deletePhone'));
vi.mock('../../website.remote', remote('create', 'updateForm', 'destroy'));
vi.mock('../../socialmedia.remote', remote('create', 'updateForm', 'destroy'));
vi.mock('../../email.remote', remote('createEmail', 'updateEmail', 'deleteEmail'));

import DeletePhone from './Phone/DeletePhone.svelte';
import DeleteWebsite from './Website/Delete.svelte';
import DeleteSocialMedia from './SocialMedia/Delete.svelte';
import DeleteEmail from './Email/Delete.svelte';

const dialogs: [string, Component<any>, Record<string, unknown>][] = [
	['phone', DeletePhone, { id: 1, type: 'M', phone: '0612345678', roles: [] }],
	['website', DeleteWebsite, { id: 2, url: 'https://example.org', roles: [] }],
	[
		'social network',
		DeleteSocialMedia,
		{ id: 3, handle: 'cabinet', url: 'https://example.org/cabinet', type: 'FB', type_display: 'Facebook', roles: [] }
	],
	['email', DeleteEmail, { id: 4, email: 'contact@example.org', roles: [] }]
];

describe.each(dialogs)('the dialog deleting a %s', (_, Dialog, data) => {
	const dialog = () => page.getByRole('dialog');

	it('opens on its trigger and offers to confirm or cancel', async () => {
		await render(Dialog, { data });

		await page.getByTitle('Supprimer').click();

		await expect.element(dialog()).toBeVisible();
		await expect.element(dialog().getByRole('button', { name: 'Confirmer' })).toBeVisible();
		await expect.element(dialog().getByRole('button', { name: 'Annuler' })).toBeVisible();
	});

	it('closes on Annuler', async () => {
		await render(Dialog, { data });
		await page.getByTitle('Supprimer').click();
		await expect.element(dialog()).toBeVisible();

		await dialog().getByRole('button', { name: 'Annuler' }).click();

		await expect.element(dialog()).not.toBeInTheDocument();
	});
});

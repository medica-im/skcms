/**
 * The search and alert modals, opened through Skeleton's modal store.
 *
 * SkeletonAppBar opens the search with Ctrl+K and SignupForm opens an alert
 * for an address Ghost already knows. Both must open when asked and leave the
 * page behind them as it was when they close.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '../../app.postcss';
import { render } from 'vitest-browser-svelte';
import { page, userEvent } from 'vitest/browser';

vi.mock('$var/variables.ts', () => ({
	menuNavCats: [
		{
			list: [
				{ title: 'Guides', list: [{ href: '/web/guide-utilisation', label: 'Guide d’utilisation' }] }
			]
		}
	]
}));

import SkeletonModalHarness from './SkeletonModalHarness.svelte';

const search = { type: 'component', component: 'modalSearch', position: 'item-start' } as const;
const alert = {
	type: 'alert',
	title: 'Erreur',
	body: 'Un membre avec cette adresse existe déjà.',
	buttonTextCancel: 'Annuler'
} as const;

const modal = () => page.getByRole('dialog');

const keepPage = (event: Event) => event.preventDefault();

beforeEach(() => document.addEventListener('click', keepPage, { capture: true }));
afterEach(() => document.removeEventListener('click', keepPage, { capture: true }));

describe('the search modal', () => {
	it('opens with its search field and its links', async () => {
		await render(SkeletonModalHarness, { settings: search });

		await page.getByRole('button', { name: 'Open' }).click();

		await expect.element(modal()).toBeVisible();
		await expect.element(page.getByPlaceholder('Search...')).toBeVisible();
		await expect.element(page.getByRole('link', { name: /Guide d’utilisation/ })).toBeVisible();
	});

	it('closes on its close button', async () => {
		await render(SkeletonModalHarness, { settings: search });
		await page.getByRole('button', { name: 'Open' }).click();
		await expect.element(modal()).toBeVisible();

		await page.getByRole('button', { name: 'Fermer' }).click();

		await expect.element(modal()).not.toBeInTheDocument();
	});

	it('closes on Escape', async () => {
		await render(SkeletonModalHarness, { settings: search });
		await page.getByRole('button', { name: 'Open' }).click();
		await expect.element(modal()).toBeVisible();

		await userEvent.keyboard('{Escape}');

		await expect.element(modal()).not.toBeInTheDocument();
	});

	it('closes when a result is chosen', async () => {
		await render(SkeletonModalHarness, { settings: search });
		await page.getByRole('button', { name: 'Open' }).click();

		await page.getByRole('link', { name: /Guide d’utilisation/ }).click();

		await expect.element(modal()).not.toBeInTheDocument();
	});
});

describe('the alert modal', () => {
	it('opens with its title and message', async () => {
		await render(SkeletonModalHarness, { settings: alert });

		await page.getByRole('button', { name: 'Open' }).click();

		await expect.element(page.getByText('Erreur')).toBeVisible();
		await expect.element(page.getByText('Un membre avec cette adresse existe déjà.')).toBeVisible();
	});

	it('closes on Annuler', async () => {
		await render(SkeletonModalHarness, { settings: alert });
		await page.getByRole('button', { name: 'Open' }).click();
		await expect.element(modal()).toBeVisible();

		await modal().getByRole('button', { name: 'Annuler' }).click();

		await expect.element(modal()).not.toBeInTheDocument();
	});
});

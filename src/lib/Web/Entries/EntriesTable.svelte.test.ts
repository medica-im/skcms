import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import EntriesTable from './EntriesTable.svelte';
import type { AdminEntry } from './entriesTable';

/**
 * The administrative entries table, rendered.
 *
 * entriesTable.test.ts covers the sorting and counting; this covers what an
 * administrator can actually see and click. The cases here are the ones where
 * a correct calculation could still reach the page wrongly: a deactivation
 * reason that never makes it into the DOM, an owner column that renders "none"
 * as a link to nowhere, a header that sorts but does not say which way.
 */

const entry = (over: Partial<AdminEntry> = {}): AdminEntry => ({
	uid: 'uid-1',
	slug: 'jean-dupont-mg-69',
	name: 'Jean Dupont',
	active: true,
	createdAt: 1_700_000_000_000,
	updatedAt: 1_700_000_000_000,
	contactUpdatedAt: null,
	deactivation_reason: null,
	deactivation_datetime: null,
	access: 'anonymous',
	effector_type: { uid: 'et-1', name: 'médecin généraliste', slug: 'mg' },
	facility: { uid: 'f-1', name: 'Cabinet du Centre', slug: 'cabinet-du-centre' },
	directories: ['santelyon3'],
	creators: [{ uid: 'u-1', name: 'Marie Martin' }],
	owners: [{ uid: 'u-1', name: 'Marie Martin' }],
	...over
});

describe('EntriesTable', () => {
	it('lists an entry with its type and facility', async () => {
		render(EntriesTable, { entries: [entry()] });

		await expect.element(page.getByText('Jean Dupont')).toBeVisible();
		await expect.element(page.getByText('médecin généraliste')).toBeVisible();
		await expect.element(page.getByText('Cabinet du Centre')).toBeVisible();
	});

	it('links the person to their entry page', async () => {
		render(EntriesTable, { entries: [entry()] });

		const link = page.getByRole('link', { name: 'Jean Dupont' });
		await expect.element(link).toHaveAttribute('href', '/e/jean-dupont-mg-69');
	});

	it('links the owner to their user page', async () => {
		render(EntriesTable, { entries: [entry()] });

		const link = page.getByRole('link', { name: 'Marie Martin' }).first();
		await expect.element(link).toHaveAttribute('href', '/web/users/u-1');
	});

	it('marks an entry nobody owns rather than leaving the cell blank', async () => {
		// The whole reason an administrator opens this page: an entry with no
		// owner cannot be edited by anyone, and an empty cell reads as "not
		// loaded yet" rather than as a problem.
		render(EntriesTable, { entries: [entry({ owners: [] })] });

		await expect.element(page.getByText('aucun')).toBeVisible();
	});

	it('shows why an inactive entry was deactivated', async () => {
		// The reason is on the node and was invisible everywhere before this
		// table existed.
		render(
			EntriesTable,
			{
				entries: [
					entry({
						active: false,
						deactivation_reason: 'Départ à la retraite',
						deactivation_datetime: '2026-03-01'
					})
				]
			}
		);

		// The row badge, not the summary count above it — both read
		// "inactives", and the one carrying the reason is inside the table.
		const badge = page.getByTitle(/Départ à la retraite/);
		await expect.element(badge).toBeVisible();
		await expect.element(badge).toHaveAttribute('title', expect.stringContaining('2026-03-01'));
	});

	it('counts what is on the page', async () => {
		render(EntriesTable, {
			entries: [
				entry({ uid: '1', active: true }),
				entry({ uid: '2', active: false }),
				entry({ uid: '3', active: true, owners: [] })
			]
		});

		await expect.element(page.getByText('3 fiches')).toBeVisible();
		await expect.element(page.getByText('1 sans propriétaire')).toBeVisible();
	});

	it('says nothing rather than showing an empty grid', async () => {
		render(EntriesTable, { entries: [] });

		await expect.element(page.getByText('Aucune fiche')).toBeVisible();
	});

	it('reorders when a header is clicked, and says which way', async () => {
		render(EntriesTable, {
			entries: [
				entry({ uid: 'zoe', name: 'Zoé Martin', createdAt: 1_000 }),
				entry({ uid: 'ana', name: 'Ana Bernard', createdAt: 2_000 })
			]
		});

		const header = page.getByRole('button', { name: /Personne/ });
		await header.click();

		// aria-sort, not a visual arrow alone: the column order has to be
		// announced to a screen reader too.
		await expect.element(header).toHaveAttribute('aria-sort', 'ascending');
	});
});

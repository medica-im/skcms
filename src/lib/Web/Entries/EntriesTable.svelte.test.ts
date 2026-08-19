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

	it('agrees in number with the count, in the feminine', async () => {
		// "1 active" / "2 actives", not "1 actives". The agreement is feminine
		// throughout because the noun is *une entrée* — a translator reaching
		// for actif/actifs would be applying the masculine form of the right
		// word to the wrong noun.
		render(EntriesTable, { entries: [entry({ uid: '1', active: true })] });

		await expect.element(page.getByRole('button', { name: '1 active' })).toBeVisible();
		await expect.element(page.getByRole('button', { name: '1 entrée' })).toBeVisible();
	});

	it('describes one entry in the singular and the count in the plural', async () => {
		// The same word in two grammatical numbers: the badge in a row says
		// what that entry is ("active"), the figure above says how many there
		// are ("2 actives"). Sharing one message key gave every row the plural.
		render(EntriesTable, {
			entries: [entry({ uid: '1', active: true }), entry({ uid: '2', active: true })]
		});

		await expect.element(page.getByRole('button', { name: '2 actives' })).toBeVisible();
		await expect.element(page.getByRole('cell', { name: 'active', exact: true }).first())
			.toBeVisible();
	});

	it('counts what is on the page', async () => {
		render(EntriesTable, {
			entries: [
				entry({ uid: '1', active: true }),
				entry({ uid: '2', active: false }),
				entry({ uid: '3', active: true, owners: [] })
			]
		});

		await expect.element(page.getByRole('button', { name: '3 entrées' })).toBeVisible();
		await expect.element(page.getByText('1 sans propriétaire')).toBeVisible();
	});

	it('narrows the table to the inactive entries when their count is clicked', async () => {
		// The control exists because a deactivated entry appears nowhere on the
		// public site: this page is the only way to find one.
		render(EntriesTable, {
			entries: [
				entry({ uid: 'a', name: 'Active Person', active: true }),
				entry({ uid: 'i', name: 'Retired Person', active: false })
			]
		});

		await page.getByRole('button', { name: /inactive/ }).click();

		await expect.element(page.getByText('Retired Person')).toBeVisible();
		await expect.element(page.getByText('Active Person')).not.toBeInTheDocument();
	});

	it('goes back to everything when the same count is clicked again', async () => {
		// No separate "Toutes" step: the filter is a toggle, so the way out is
		// the control you came in by.
		render(EntriesTable, {
			entries: [
				entry({ uid: 'a', name: 'Active Person', active: true }),
				entry({ uid: 'i', name: 'Retired Person', active: false })
			]
		});

		const inactive = page.getByRole('button', { name: /inactive/ });
		await inactive.click();
		await inactive.click();

		await expect.element(page.getByText('Active Person')).toBeVisible();
		await expect.element(page.getByText('Retired Person')).toBeVisible();
	});

	it('keeps the counts describing everything while filtered', async () => {
		// Otherwise clicking "1 inactive" would leave "0 actives" beside it and
		// the numbers would describe the view rather than the directory.
		render(EntriesTable, {
			entries: [
				entry({ uid: 'a', active: true }),
				entry({ uid: 'i', active: false })
			]
		});

		await page.getByRole('button', { name: /inactive/ }).click();

		// "1 active", singular — the count drives the plural form, and the
		// agreement is feminine because it describes une entrée.
		await expect.element(page.getByRole('button', { name: '1 active' })).toBeVisible();
	});

	it('says nothing rather than showing an empty grid', async () => {
		render(EntriesTable, { entries: [] });

		await expect.element(page.getByText('Aucune entrée')).toBeVisible();
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

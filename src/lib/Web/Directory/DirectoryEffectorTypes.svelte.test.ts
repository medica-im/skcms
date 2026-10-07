/**
 * The categories a directory offers at entry creation, on the "Annuaires" page.
 *
 * The page shows the current categories and nothing to edit them with: edited
 * in place, among the directory's other settings, the controls read as part of
 * those. A button opens an overlay where they are added and removed.
 *
 * No category listed means every one is offered — the default, and what
 * "remove all" returns to, so that one asks first. Each action saves at once;
 * the overlay and the page show what the server answered. Used on phones:
 * every control is a 44px target, and the overlay fits a phone's width.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '../../../app.postcss';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';

const remote = vi.hoisted(() => ({
	offerEffectorType: vi.fn(),
	withdrawEffectorType: vi.fn(),
	withdrawAllEffectorTypes: vi.fn()
}));
vi.mock('../../../directory.remote', () => remote);
vi.mock('$lib/Web/EffectorTypeSelect.svelte', async () => ({
	default: (await import('../Entry/EffectorTypeSelectStub.svelte')).default
}));

import DirectoryEffectorTypes from './DirectoryEffectorTypes.svelte';

const NURSE = { uid: 't1', label: 'Infirmier' };
const IPA = { uid: 't2', label: 'IPA' };

const directory = (effector_types: { uid: string; label: string }[]) => ({
	uid: 'd1',
	name: 'ipa',
	display_name: 'IPA',
	owner: null,
	list_owner_entry: true,
	effector_types
});

const answered = (effector_types: { uid: string; label: string }[]) => ({
	success: true,
	status: 200,
	directory: directory(effector_types)
});

const overlay = () => page.getByTestId('directory-types-dialog');
const summary = () => page.getByTestId('directory-types-summary');
const height = (name: string) =>
	page.getByRole('button', { name }).element().getBoundingClientRect().height;

async function openOverlay() {
	await page.getByRole('button', { name: 'Modifier les catégories' }).click();
	await expect.element(overlay()).toBeVisible();
}

beforeEach(() => vi.clearAllMocks());

describe('DirectoryEffectorTypes on the page', () => {
	it('says every category is offered when none is listed', async () => {
		render(DirectoryEffectorTypes, { directory: directory([]) });

		await expect.element(page.getByTestId('directory-types-all')).toBeVisible();
	});

	it('shows the offered categories, with nothing to edit them in place', async () => {
		render(DirectoryEffectorTypes, { directory: directory([NURSE, IPA]) });

		await expect.element(summary()).toHaveTextContent('Infirmier');
		await expect.element(summary()).toHaveTextContent('IPA');
		await expect.element(page.getByRole('button', { name: 'Retirer Infirmier' })).not.toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: 'Ajouter' })).not.toBeInTheDocument();
		await expect.element(overlay()).not.toBeVisible();
	});

	it('opens the overlay from a 44px button', async () => {
		render(DirectoryEffectorTypes, { directory: directory([NURSE]) });

		expect(height('Modifier les catégories')).toBeGreaterThanOrEqual(44);
		await openOverlay();
		await expect.element(page.getByRole('button', { name: 'Retirer Infirmier' })).toBeVisible();
	});
});

describe('DirectoryEffectorTypes overlay', () => {
	it('gives every control a 44px target', async () => {
		render(DirectoryEffectorTypes, { directory: directory([NURSE, IPA]) });
		await openOverlay();

		for (const name of ['Retirer Infirmier', 'Ajouter', 'Retirer toutes les catégories', 'Fermer']) {
			expect(height(name), name).toBeGreaterThanOrEqual(44);
		}
	});

	it("fits a phone's width", async () => {
		await page.viewport(390, 844);
		render(DirectoryEffectorTypes, { directory: directory([NURSE, IPA]) });
		await openOverlay();

		const box = overlay().element().getBoundingClientRect();
		expect(box.left).toBeGreaterThanOrEqual(0);
		expect(box.right).toBeLessThanOrEqual(390);
	});

	it('adds the chosen category, and the page shows it', async () => {
		remote.offerEffectorType.mockResolvedValue(answered([NURSE, IPA]));
		render(DirectoryEffectorTypes, { directory: directory([NURSE]) });
		await openOverlay();

		const add = page.getByRole('button', { name: 'Ajouter' });
		await expect.element(add).toBeDisabled();
		await page.getByTestId('stub-pick-other').click();
		await add.click();

		expect(remote.offerEffectorType).toHaveBeenCalledWith({ uid: 'd1', effector_type: 't2' });
		await expect.element(page.getByRole('button', { name: 'Retirer IPA' })).toBeVisible();
		await expect.element(summary()).toHaveTextContent('IPA');
	});

	it('removes one category', async () => {
		remote.withdrawEffectorType.mockResolvedValue(answered([IPA]));
		render(DirectoryEffectorTypes, { directory: directory([NURSE, IPA]) });
		await openOverlay();

		await page.getByRole('button', { name: 'Retirer Infirmier' }).click();

		expect(remote.withdrawEffectorType).toHaveBeenCalledWith({ uid: 'd1', effector_type: 't1' });
		await expect.element(page.getByRole('button', { name: 'Retirer Infirmier' })).not.toBeInTheDocument();
		await expect.element(summary()).not.toHaveTextContent('Infirmier');
	});

	it('removes them all only once confirmed', async () => {
		remote.withdrawAllEffectorTypes.mockResolvedValue(answered([]));
		render(DirectoryEffectorTypes, { directory: directory([NURSE, IPA]) });
		await openOverlay();

		await page.getByRole('button', { name: 'Retirer toutes les catégories' }).click();
		expect(remote.withdrawAllEffectorTypes).not.toHaveBeenCalled();

		await page.getByTestId('directory-types-clear-confirm').click();

		expect(remote.withdrawAllEffectorTypes).toHaveBeenCalledWith({ uid: 'd1' });
		await expect.element(page.getByTestId('directory-types-all')).toBeVisible();
	});

	it('can step back from removing them all', async () => {
		render(DirectoryEffectorTypes, { directory: directory([NURSE]) });
		await openOverlay();

		await page.getByRole('button', { name: 'Retirer toutes les catégories' }).click();
		await page.getByTestId('directory-types-clear-cancel').click();

		expect(remote.withdrawAllEffectorTypes).not.toHaveBeenCalled();
		await expect.element(page.getByTestId('directory-types-clear-confirm')).not.toBeInTheDocument();
	});

	it('says when a change failed, and keeps the list as it was', async () => {
		remote.withdrawEffectorType.mockResolvedValue({ success: false, status: 500 });
		render(DirectoryEffectorTypes, { directory: directory([NURSE]) });
		await openOverlay();

		await page.getByRole('button', { name: 'Retirer Infirmier' }).click();

		await expect.element(page.getByRole('alert')).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Retirer Infirmier' })).toBeVisible();
	});

	it('closes', async () => {
		render(DirectoryEffectorTypes, { directory: directory([NURSE]) });
		await openOverlay();

		await page.getByRole('button', { name: 'Fermer' }).click();

		await expect.element(overlay()).not.toBeVisible();
	});
});

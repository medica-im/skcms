/**
 * Who may see a directory, on the "Annuaires" page.
 *
 * A sibling directory a site shows on one of its pages (Lyon 3's mental
 * health directory) can be reserved to a role: the backend refuses its list
 * to lesser callers (GET /entries?directory=). A site's main directory is
 * public by definition, so its row says so instead of offering the choice.
 * Superusers only, like the owner switch; saved at once, put back if refused.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '../../../app.postcss';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';

const remote = vi.hoisted(() => ({
	setListOwnerEntry: vi.fn(),
	setDirectoryMinimumRole: vi.fn(),
	offerEffectorType: vi.fn(),
	withdrawEffectorType: vi.fn(),
	withdrawAllEffectorTypes: vi.fn()
}));
vi.mock('../../../directory.remote', () => remote);
const state = vi.hoisted(() => ({ page: { data: { user: { role: 'superuser' } } } }));
vi.mock('$app/state', () => state);
vi.mock('$app/navigation', () => ({ invalidate: vi.fn() }));
vi.mock('$lib/Web/EffectorTypeSelect.svelte', async () => ({
	default: (await import('../Entry/EffectorTypeSelectStub.svelte')).default
}));

import DirectorySettingsRow from './DirectorySettingsRow.svelte';
import type { DirectorySettings } from '$lib/interfaces/v2/directory';

const directory = (overrides: Partial<DirectorySettings> = {}): DirectorySettings => ({
	uid: 'd2',
	name: 'cpts-lyon-3-sante-mentale',
	display_name: 'Santé mentale',
	owner: { uid: 'o1', label: 'CPTS Lyon 3' },
	list_owner_entry: true,
	effector_types: [],
	main: false,
	minimum_role: 'anonymous' as const,
	...overrides
});

const selector = () => page.getByRole('combobox', { name: 'Visible par' });

beforeEach(() => {
	state.page.data.user.role = 'superuser';
	remote.setDirectoryMinimumRole.mockReset();
});

describe('DirectorySettingsRow: who may see it', () => {
	it('shows a sibling directory’s current minimum role', async () => {
		render(DirectorySettingsRow, { props: { directory: directory({ minimum_role: 'staff' }) } });

		await expect.element(selector()).toHaveValue('staff');
	});

	it('says the main directory is always public, and offers no choice', async () => {
		render(DirectorySettingsRow, { props: { directory: directory({ main: true }) } });

		await expect.element(page.getByText('Annuaire principal du site : toujours public.')).toBeVisible();
		await expect.element(selector()).not.toBeInTheDocument();
	});

	it('saves a change at once and says so', async () => {
		remote.setDirectoryMinimumRole.mockResolvedValue({ success: true, status: 200 });
		render(DirectorySettingsRow, { props: { directory: directory() } });

		await selector().selectOptions('staff');

		expect(remote.setDirectoryMinimumRole).toHaveBeenCalledWith({ uid: 'd2', minimum_role: 'staff' });
		await expect.element(page.getByTestId('minimum-role-saved')).toBeVisible();
	});

	it('puts the old value back when the change is refused', async () => {
		remote.setDirectoryMinimumRole.mockResolvedValue({ success: false, status: 409 });
		render(DirectorySettingsRow, { props: { directory: directory() } });

		await selector().selectOptions('staff');

		await expect.element(selector()).toHaveValue('anonymous');
		await expect.element(page.getByRole('alert')).toBeVisible();
	});

	it('is not offered to administrators', async () => {
		state.page.data.user.role = 'administrator';
		render(DirectorySettingsRow, { props: { directory: directory() } });

		await expect.element(page.getByRole('heading', { name: 'Santé mentale' })).toBeVisible();
		await expect.element(selector()).not.toBeInTheDocument();
	});

	it('is a 44px target', async () => {
		render(DirectorySettingsRow, { props: { directory: directory() } });

		await expect.element(selector()).toBeVisible();
		expect(selector().element().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
	});
});

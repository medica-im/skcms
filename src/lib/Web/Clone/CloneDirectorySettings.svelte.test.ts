/**
 * Cloning a directory copies what decides its lists, not only its entries: the needs it
 * lists and the types it offers are ticked by default, whether it lists its owner's
 * entry and who may read it wait for a tick (a deployment may choose them differently
 * on purpose). The backend re-reads the source when applying; the page sends only keys.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page as screen } from 'vitest/browser';
import * as m from '$msgs';
import CloneDirectorySettings from './CloneDirectorySettings.svelte';

const remote = vi.hoisted(() => ({ directoryDifferences: vi.fn(), applyDirectorySettings: vi.fn() }));
vi.mock('../../../clone.remote', () => remote);

const props = { instance: 'dev', token: 't', directory: 'cpts-lyon-3-sante-mentale' };

const differences = [
	{ key: 'lists_needs', source: ['sante-mentale'], here: [], missing_here: [], applied_by_default: true },
	{ key: 'minimum_role', source: 'staff', here: 'anonymous', missing_here: [], applied_by_default: false }
];

beforeEach(() => {
	remote.directoryDifferences.mockReset();
	remote.applyDirectorySettings.mockReset();
	remote.directoryDifferences.mockResolvedValue({ ok: true, differences });
	remote.applyDirectorySettings.mockResolvedValue({ ok: true, applied: ['lists_needs'], warnings: [] });
});

const box = (name: string) => screen.getByRole('checkbox', { name });

describe('CloneDirectorySettings', () => {
	it('ticks what decides the lists, and leaves access choices to the superuser', async () => {
		render(CloneDirectorySettings, { props });
		await expect.element(box(m.CLONE_SETTING_LISTS_NEEDS())).toBeChecked();
		await expect.element(box(m.CLONE_SETTING_MINIMUM_ROLE())).not.toBeChecked();
		expect(remote.directoryDifferences).toHaveBeenCalledWith(props);
	});

	it('shows the source’s value beside this instance’s', async () => {
		render(CloneDirectorySettings, { props });
		await expect.element(screen.getByText('sante-mentale')).toBeInTheDocument();
	});

	it('says so when both directories are set the same', async () => {
		remote.directoryDifferences.mockResolvedValue({ ok: true, differences: [] });
		render(CloneDirectorySettings, { props });
		await expect.element(screen.getByText(m.CLONE_DIRECTORY_SETTINGS_SAME())).toBeInTheDocument();
	});

	it('names what the source lists but this instance lacks', async () => {
		remote.directoryDifferences.mockResolvedValue({
			ok: true,
			differences: [{ ...differences[0], missing_here: ['addictions'] }]
		});
		render(CloneDirectorySettings, { props });
		await expect.element(screen.getByText(m.CLONE_SETTING_MISSING_HERE({ names: 'addictions' }))).toBeInTheDocument();
	});

	it('applies only the ticked settings', async () => {
		render(CloneDirectorySettings, { props });
		await box(m.CLONE_SETTING_MINIMUM_ROLE()).click();
		await screen.getByRole('button', { name: m.CLONE_DIRECTORY_SETTINGS_APPLY() }).click();
		expect(remote.applyDirectorySettings).toHaveBeenCalledWith({ ...props, keys: ['lists_needs', 'minimum_role'] });
	});

	it('cannot apply when nothing is ticked', async () => {
		render(CloneDirectorySettings, { props });
		await box(m.CLONE_SETTING_LISTS_NEEDS()).click();
		await expect.element(screen.getByRole('button', { name: m.CLONE_DIRECTORY_SETTINGS_APPLY() })).toBeDisabled();
	});

	it('reports what the backend skipped', async () => {
		remote.applyDirectorySettings.mockResolvedValue({
			ok: true,
			applied: ['lists_needs'],
			warnings: ["lists_needs: 'addictions' does not exist here, skipped"]
		});
		render(CloneDirectorySettings, { props });
		await screen.getByRole('button', { name: m.CLONE_DIRECTORY_SETTINGS_APPLY() }).click();
		await expect.element(screen.getByText(/'addictions' does not exist here/)).toBeInTheDocument();
	});
});

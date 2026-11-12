/**
 * An entry without premises names the area it answers for in place of an address:
 * "Zone couverte : France". Nothing shows for an entry that covers nothing.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page as screen } from 'vitest/browser';
import * as m from '$msgs';
import EntryCoverage from './EntryCoverage.svelte';
import '../../../app.postcss';

describe('EntryCoverage', () => {
	it('shows nothing when the entry covers nothing', async () => {
		render(EntryCoverage, { props: { coverage: [] } });
		await expect.element(screen.getByText(m.DIRECTORY_ENTRY_COVERAGE())).not.toBeInTheDocument();
	});

	it('names the places it covers', async () => {
		render(EntryCoverage, {
			props: {
				coverage: [
					{ uid: 'fr', name: 'France', kind: 'country' },
					{ uid: 'ara', name: 'Auvergne-Rhône-Alpes', kind: 'region' }
				]
			}
		});
		await expect.element(screen.getByText(m.DIRECTORY_ENTRY_COVERAGE())).toBeVisible();
		await expect.element(screen.getByText('France')).toBeVisible();
		await expect.element(screen.getByText('Auvergne-Rhône-Alpes')).toBeVisible();
	});
});

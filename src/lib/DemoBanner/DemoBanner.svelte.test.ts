/**
 * The banner of a demonstration site.
 *
 * msp.medica.im shows a fictional MSP to prospective clients: its people and
 * its town are invented. Nobody landing on a page of it -- from a shared link,
 * not the home page -- may take it for a real practice and call it. So every
 * page says so, in a strip the visitor cannot close.
 */
import { describe, it, expect } from 'vitest';
import '../../app.postcss';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import DemoBanner from './DemoBanner.svelte';

const TEXT = 'Site de démonstration — structure et praticiens fictifs';

describe('DemoBanner', () => {
	it('says the site is a demonstration', async () => {
		render(DemoBanner, { text: TEXT });
		await expect.element(page.getByRole('note')).toHaveTextContent(TEXT);
	});

	it('cannot be closed', async () => {
		render(DemoBanner, { text: TEXT });
		await expect.element(page.getByRole('note')).toBeVisible();
		expect(page.getByRole('button').elements()).toHaveLength(0);
	});
});

/**
 * The bar of the list's resend mode: how many are ticked, the shortcuts to
 * tick them all or none, a look at the ones left out, and the way on (send)
 * or back (cancel). It sticks to the bottom of the screen so it stays in
 * reach on every page of the list.
 */
import { describe, it, expect, vi } from 'vitest';
import '../../app.postcss';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import ResendBar from './ResendBar.svelte';

const props = (over = {}) => ({
	selected: 12,
	sendable: 15,
	onlyExcluded: false,
	onselectall: vi.fn(),
	onselectnone: vi.fn(),
	ononlyexcluded: vi.fn(),
	oncancel: vi.fn(),
	onsend: vi.fn(),
	...over
});

const send = () => page.getByRole('button', { name: /Renvoyer/ });

describe('ResendBar', () => {
	it('says how many of the sendable invitations are ticked', async () => {
		render(ResendBar, props());
		await expect.element(page.getByText('12 / 15 sélectionné(s)')).toBeVisible();
	});

	it('names the number of emails on the send button', async () => {
		render(ResendBar, props());
		await expect.element(send()).toHaveTextContent('Renvoyer (12)');
	});

	it('sends nothing when nothing is ticked', async () => {
		render(ResendBar, props({ selected: 0 }));
		await expect.element(send()).toBeDisabled();
	});

	it('passes each choice on', async () => {
		const p = props();
		render(ResendBar, p);
		await page.getByRole('button', { name: 'Tout sélectionner' }).click();
		await page.getByRole('button', { name: 'Tout désélectionner' }).click();
		await page.getByRole('checkbox', { name: 'Voir seulement les non cochées' }).click();
		await page.getByRole('button', { name: 'Annuler' }).click();
		await send().click();
		expect(p.onselectall).toHaveBeenCalledOnce();
		expect(p.onselectnone).toHaveBeenCalledOnce();
		expect(p.ononlyexcluded).toHaveBeenCalledWith(true);
		expect(p.oncancel).toHaveBeenCalledOnce();
		expect(p.onsend).toHaveBeenCalledOnce();
	});

	it('makes every button a 44px target', async () => {
		render(ResendBar, props());
		const buttons = page.getByRole('button').all();
		for (const button of buttons) {
			const height = (button.element() as HTMLElement).getBoundingClientRect().height;
			expect(height).toBeGreaterThanOrEqual(44);
		}
	});
});

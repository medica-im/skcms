/**
 * A mistyped address caught while it is typed, not after it bounced.
 *
 * Under the invitation form's email field: once an address looks complete
 * and typing pauses, the backend checks it (mailer.addresscheck) -- a typo
 * in a common domain gets a one-click suggestion, a domain that cannot
 * receive mail and an address already known to be bad get a warning.
 * Warnings only: the form can still be sent.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '../../app.postcss';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';

const remote = vi.hoisted(() => ({ checkAddresses: vi.fn() }));
vi.mock('../../invitee.remote', () => remote);

import AddressCheckHintHarness from './AddressCheckHintHarness.svelte';

const answer = (email: string, suggestion: string | null, problem: string | null) => [
	{ email, suggestion, problem }
];

beforeEach(() => remote.checkAddresses.mockReset());

describe('checking an address as it is typed', () => {
	it('suggests the likely address, applied with one click', async () => {
		remote.checkAddresses.mockResolvedValue(answer('jean@gmial.com', 'jean@gmail.com', null));
		render(AddressCheckHintHarness, { initial: '' });

		await page.getByLabelText('Email').fill('jean@gmial.com');
		const suggestion = page.getByRole('button', { name: 'jean@gmail.com' });
		await expect.element(suggestion).toBeVisible();
		await suggestion.click();

		await expect.element(page.getByLabelText('Email')).toHaveValue('jean@gmail.com');
	});

	it('warns of a domain that cannot receive mail', async () => {
		remote.checkAddresses.mockResolvedValue(answer('x@nowhere.fr', null, 'no_mail_domain'));
		render(AddressCheckHintHarness, { initial: '' });

		await page.getByLabelText('Email').fill('x@nowhere.fr');
		await expect.element(page.getByTestId('address-check-hint')).toHaveTextContent('ne reçoit pas');
	});

	it('warns of an address already rejected', async () => {
		remote.checkAddresses.mockResolvedValue(answer('gone@medica.im', null, 'bounced'));
		render(AddressCheckHintHarness, { initial: '' });

		await page.getByLabelText('Email').fill('gone@medica.im');
		await expect.element(page.getByTestId('address-check-hint')).toHaveTextContent('déjà été rejetée');
	});

	it('says nothing of a fine address, and does not ask for an incomplete one', async () => {
		remote.checkAddresses.mockResolvedValue(answer('ok@gmail.com', null, null));
		render(AddressCheckHintHarness, { initial: '' });

		await page.getByLabelText('Email').fill('ok@gma');
		await new Promise((r) => setTimeout(r, 900));
		expect(remote.checkAddresses).not.toHaveBeenCalled();

		await page.getByLabelText('Email').fill('ok@gmail.com');
		await expect.poll(() => remote.checkAddresses.mock.calls.length).toBe(1);
		await expect.element(page.getByTestId('address-check-hint')).not.toBeInTheDocument();
	});
});

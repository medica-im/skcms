/**
 * A bad address, shown where the administrator works and fixed there.
 *
 * The organization's administrators are the ones who can get the right
 * address from the member, so the invitation pages say plainly what went
 * wrong and offer the fix:
 *
 * - the list flags the address (colour, icon, and words for a screen reader
 *   and a tooltip -- never colour alone) and offers an "À vérifier" filter
 *   when there is something to check;
 * - the invitation's page says what happened and what to do, and lets the
 *   address be corrected in place: the invitation then goes to the new
 *   address;
 * - resending to an address that bounced asks first ("rejetée le … —
 *   renvoyer quand même ?"): the backend no longer retries it on its own;
 * - a person who refused the organization's mail (spam report,
 *   unsubscribe) is explained, with no way to send anyway.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '../../app.postcss';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';

const remote = vi.hoisted(() => ({
	resendInvitation: vi.fn(),
	correctInviteeAddress: vi.fn()
}));
vi.mock('../../invitee.remote', () => remote);
vi.mock('$app/navigation', () => ({ invalidateAll: vi.fn() }));

import InviteeAddressFlag from './InviteeAddressFlag.svelte';
import InviteeAddressProblem from './InviteeAddressProblem.svelte';
import InviteeResend from './InviteeResend.svelte';
import InviteeStatusFilter from './InviteeStatusFilter.svelte';

const SINCE = '2026-10-06T12:00:00Z';
const bouncedDelivery = { status: 'bounced', at: SINCE, error: '550 5.1.1 User unknown', errorKind: null };
const invitee = (extra: Record<string, unknown> = {}) =>
	({
		uid: 'u1', email: 'nobody@medica.im', name: 'Who', role: 'staff', active: true,
		redeemedAt: null, createdAt: SINCE, createdBy: 'x', ...extra
	}) as never;

beforeEach(() => {
	remote.resendInvitation.mockReset();
	remote.correctInviteeAddress.mockReset();
});

describe('the flag next to the address', () => {
	it('says a bounced address needs checking, in words too', async () => {
		render(InviteeAddressFlag, { invitee: invitee({ emailDelivery: bouncedDelivery }) });

		const flag = page.getByTestId('invitee-address-flag');
		await expect.element(flag).toBeVisible();
		await expect.element(flag).toHaveAttribute('title', 'Adresse rejetée');
		await expect.element(flag).toHaveTextContent('Adresse à vérifier : Adresse rejetée');
	});

	it('names a remembered address before any new attempt', async () => {
		render(InviteeAddressFlag, {
			invitee: invitee({ addressIssue: { reason: 'refused', since: SINCE, detail: null } })
		});

		await expect.element(page.getByTestId('invitee-address-flag')).toHaveAttribute('title', 'Adresse invalide');
	});

	it('is absent when the address is fine', async () => {
		render(InviteeAddressFlag, { invitee: invitee({ emailDelivery: { ...bouncedDelivery, status: 'sent' } }) });

		await expect.element(page.getByTestId('invitee-address-flag')).not.toBeInTheDocument();
	});
});

describe('the "À vérifier" filter', () => {
	const counts = (check: number) => ({ all: 3, active: 3, used: 0, disabled: 0, check });

	it('is offered when an address needs checking', async () => {
		render(InviteeStatusFilter, { value: 'all', counts: counts(2), onchange: () => {} });

		await expect.element(page.getByRole('button', { name: /À vérifier/ })).toHaveTextContent('2');
	});

	it('is not, when none does', async () => {
		render(InviteeStatusFilter, { value: 'all', counts: counts(0), onchange: () => {} });

		await expect.element(page.getByRole('button', { name: /À vérifier/ })).not.toBeInTheDocument();
	});
});

describe('the problem on the invitation page', () => {
	it('says what happened and what to do, with the service’s words', async () => {
		render(InviteeAddressProblem, { invitee: invitee({ emailDelivery: bouncedDelivery }) });

		const box = page.getByTestId('invitee-address-problem');
		await expect.element(box).toHaveTextContent('Vérifiez l’adresse auprès de la personne');
		await expect.element(box).toHaveTextContent('550 5.1.1 User unknown');
	});

	it('corrects the address in place, which sends the invitation there', async () => {
		remote.correctInviteeAddress.mockResolvedValue({ success: true, status: 200 });
		render(InviteeAddressProblem, { invitee: invitee({ emailDelivery: bouncedDelivery }) });

		await page.getByLabelText('Adresse corrigée').fill('right@medica.im');
		await page.getByRole('button', { name: 'Corriger et renvoyer' }).click();

		await expect.poll(() => remote.correctInviteeAddress.mock.calls[0]?.[0]).toEqual({
			uid: 'u1', email: 'right@medica.im'
		});
		await expect.element(page.getByRole('status')).toHaveTextContent('envoyée à la nouvelle adresse');
	});

	it('offers no fix when the person refused the organization’s mail', async () => {
		render(InviteeAddressProblem, {
			invitee: invitee({ addressIssue: { reason: 'complained', since: SINCE, detail: null } })
		});

		await expect.element(page.getByTestId('invitee-address-problem')).toHaveTextContent('indésirables');
		await expect.element(page.getByRole('button', { name: 'Corriger et renvoyer' })).not.toBeInTheDocument();
	});

	it('is absent when the address is fine', async () => {
		render(InviteeAddressProblem, { invitee: invitee() });

		await expect.element(page.getByTestId('invitee-address-problem')).not.toBeInTheDocument();
	});
});

describe('resending to an address that bounced', () => {
	it('asks first, then sends anyway', async () => {
		remote.resendInvitation
			.mockResolvedValueOnce({ success: false, status: 409, code: 'address_rejected', since: SINCE })
			.mockResolvedValueOnce({ success: true, status: 200 });
		render(InviteeResend, { uid: 'u1' });

		await page.getByRole('button', { name: "Renvoyer l'invitation" }).click();
		await expect.element(page.getByTestId('invitee-resend-confirm')).toHaveTextContent('rejetée le');
		await page.getByRole('button', { name: 'Renvoyer quand même' }).click();

		await expect.poll(() => remote.resendInvitation.mock.calls[1]?.[0]).toEqual({ uid: 'u1', force: true });
	});

	it('explains a refusal of the organization’s mail, and stops there', async () => {
		remote.resendInvitation.mockResolvedValue({ success: false, status: 409, code: 'address_opted_out' });
		render(InviteeResend, { uid: 'u1' });

		await page.getByRole('button', { name: "Renvoyer l'invitation" }).click();
		await expect.element(page.getByTestId('invitee-resend-outcome')).toHaveTextContent('refusé');
		await expect.element(page.getByRole('button', { name: 'Renvoyer quand même' })).not.toBeInTheDocument();
	});
});

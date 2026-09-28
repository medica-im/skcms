/**
 * Whether an invitation's email went out.
 *
 * An invitation whose email never left used to look like any other: the
 * invitee waited, the administrator knew nothing. The backend now records each
 * attempt (queued, sent, failed, or unconfirmed when nothing settled it).
 *
 * In the list only what needs attention is shown -- "sent" on every row
 * would bury the one failure. The detail page always says it, with the
 * reason of a failure. Like InviteeStatus, never colour alone: an icon and
 * a word.
 */
import { describe, it, expect } from 'vitest';
import '../../app.postcss';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import InviteeEmailDelivery from './InviteeEmailDelivery.svelte';

const AT = '2026-09-28T10:46:45Z';
const delivery = (status: string, error: string | null = null) => ({ status, at: AT, error }) as never;
const badge = () => page.getByTestId('invitee-email-delivery');

describe('InviteeEmailDelivery in the list', () => {
	it('says nothing when the email went out', async () => {
		render(InviteeEmailDelivery, { delivery: delivery('sent') });

		await expect.element(badge()).not.toBeInTheDocument();
	});

	it('says nothing for an invitation with no recorded attempt', async () => {
		render(InviteeEmailDelivery, { delivery: null });

		await expect.element(badge()).not.toBeInTheDocument();
	});

	it.each([
		['failed', "Échec de l'envoi"],
		['queued', 'Envoi en cours'],
		['unconfirmed', 'Envoi non confirmé']
	])('flags a %s email in words', async (status, words) => {
		render(InviteeEmailDelivery, { delivery: delivery(status) });

		await expect.element(badge()).toHaveAttribute('data-state', status);
		await expect.element(badge()).toHaveTextContent(words);
	});

	it('keeps the reason of a failure for the detail page', async () => {
		render(InviteeEmailDelivery, { delivery: delivery('failed', '401: Forbidden') });

		await expect.element(page.getByText('401: Forbidden')).not.toBeInTheDocument();
	});
});

describe('InviteeEmailDelivery on the detail page', () => {
	it('says the email went out, and when', async () => {
		render(InviteeEmailDelivery, { delivery: delivery('sent'), detailed: true });

		await expect.element(badge()).toHaveTextContent('E-mail envoyé');
		await expect.element(page.getByTestId('invitee-email-delivery-at')).toBeVisible();
	});

	it('gives the reason of a failure', async () => {
		render(InviteeEmailDelivery, { delivery: delivery('failed', '401: Forbidden'), detailed: true });

		await expect.element(page.getByTestId('invitee-email-delivery-error')).toHaveTextContent('401: Forbidden');
	});

	it('says when no attempt was recorded', async () => {
		render(InviteeEmailDelivery, { delivery: null, detailed: true });

		await expect.element(badge()).toHaveAttribute('data-state', 'unknown');
		await expect.element(badge()).toHaveTextContent('Aucun envoi enregistré');
	});
});

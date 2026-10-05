/**
 * Whether an invitation's email went out.
 *
 * An invitation whose email never left used to look like any other: the
 * invitee waited, the administrator knew nothing. The backend now records each
 * attempt: queued, sent, or failed -- refused, or queued and never settled
 * (timedOut: a worker that died before it could say so).
 *
 * Three places, three variants:
 * - flag (default): the compact card, which has no columns, only what needs
 *   attention -- a failed or pending email;
 * - column: the list's "Envoi" column, every invitation, in a short word;
 * - detail: the invitation's page, in full, with the time and a failure's
 *   reason.
 * Like InviteeStatus, never colour alone: an icon and a word.
 */
import { describe, it, expect } from 'vitest';
import '../../app.postcss';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import InviteeEmailDelivery from './InviteeEmailDelivery.svelte';

const AT = '2026-09-28T10:46:45Z';
const delivery = (status: string, error: string | null = null, timedOut = false) =>
	({ status, at: AT, error, timedOut }) as never;
const badge = () => page.getByTestId('invitee-email-delivery');
// Its own id: on a large screen the row shows the flag and the column at once.
const cell = () => page.getByTestId('invitee-email-delivery-column');

describe('InviteeEmailDelivery as a flag on the compact card', () => {
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
		['queued', 'Envoi en cours']
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

describe("InviteeEmailDelivery in the list's column", () => {
	it.each([
		['sent', 'Envoyé'],
		['failed', 'Échec'],
		['queued', 'En cours']
	])('says a %s email in a short word', async (status, words) => {
		render(InviteeEmailDelivery, { delivery: delivery(status), variant: 'column' });

		await expect.element(cell()).toHaveAttribute('data-state', status);
		await expect.element(cell()).toHaveTextContent(words);
	});

	// An email that did not go out needs acting on -- the reason and the
	// resend button are on the invitation's page -- so it is a red cross,
	// the same size as the other icons, and the cell leads there.
	it.each([
		['refused by the mail service', delivery('failed', '401: Forbidden')],
		['never settled (timed out)', delivery('failed', null, true)]
	])('makes an email %s a link to the invitation, with a red cross', async (_why, failed) => {
		render(InviteeEmailDelivery, { delivery: failed, variant: 'column', href: '/web/invite/invitees/u1' });

		const link = page.getByRole('link', { name: /Échec/ });
		await expect.element(link).toHaveAttribute('href', '/web/invite/invitees/u1');
		await expect.element(link.getByTestId('invitee-email-delivery-cross')).toBeVisible();
	});

	it('links nowhere when the email went out', async () => {
		render(InviteeEmailDelivery, { delivery: delivery('sent'), variant: 'column', href: '/web/invite/invitees/u1' });

		await expect.element(page.getByRole('link')).not.toBeInTheDocument();
	});

	it('shows a dash for no recorded attempt, and says why to a screen reader', async () => {
		render(InviteeEmailDelivery, { delivery: null, variant: 'column' });

		await expect.element(cell()).toHaveAttribute('data-state', 'unknown');
		await expect.element(cell()).toHaveTextContent('—');
		await expect.element(page.getByText('Aucun envoi enregistré')).toBeInTheDocument();
	});
});

describe('InviteeEmailDelivery on the detail page', () => {
	it('says the email went out, and when', async () => {
		render(InviteeEmailDelivery, { delivery: delivery('sent'), variant: 'detail' });

		await expect.element(badge()).toHaveTextContent('E-mail envoyé');
		await expect.element(page.getByTestId('invitee-email-delivery-at')).toBeVisible();
	});

	it('gives the reason of a failure', async () => {
		render(InviteeEmailDelivery, { delivery: delivery('failed', '401: Forbidden'), variant: 'detail' });

		await expect.element(page.getByTestId('invitee-email-delivery-error')).toHaveTextContent('401: Forbidden');
	});

	it('says an email nobody settled most likely never left', async () => {
		render(InviteeEmailDelivery, { delivery: delivery('failed', null, true), variant: 'detail' });

		await expect.element(badge()).toHaveTextContent("Échec de l'envoi");
		await expect.element(page.getByTestId('invitee-email-delivery-error')).toHaveTextContent(
			'Aucune confirmation d’envoi après 15 minutes'
		);
	});

	// One icon for a failure wherever it is shown, so it reads the same.
	it.each(['flag', 'detail'] as const)('shows a failure with the red cross in the %s', async (variant) => {
		render(InviteeEmailDelivery, { delivery: delivery('failed', '401: Forbidden'), variant });

		await expect.element(page.getByTestId('invitee-email-delivery-cross')).toBeVisible();
	});

	it('says when no attempt was recorded', async () => {
		render(InviteeEmailDelivery, { delivery: null, variant: 'detail' });

		await expect.element(badge()).toHaveAttribute('data-state', 'unknown');
		await expect.element(badge()).toHaveTextContent('Aucun envoi enregistré');
	});
});

/**
 * The whole lifecycle, and why a failure happened in words.
 *
 * Past "accepted", the mail service reports what became of the email:
 * delivered, deferred (it is still trying), bounced, reported as spam. And an
 * address on the do-not-send list is not sent at all (suppressed). Each needs
 * a word; the ones that need acting on -- bounced, complained, suppressed --
 * read as failures, with the red cross and the link to the invitation.
 *
 * A failure's reason was the service's raw text ("400: 'to' parameter is not
 * a valid address"). The errorKind says what it means and what to do, in the
 * page's language; the raw text stays, smaller, for whoever digs further.
 */
const withKind = (status: string, errorKind: string, error = 'raw service text') =>
	({ status, at: AT, error, errorKind, timedOut: false }) as never;

describe('InviteeEmailDelivery through the lifecycle', () => {
	it.each([
		['delivered', 'Distribué'],
		['deferred', 'Retardé'],
		['bounced', 'Rejeté'],
		['complained', 'Signalé'],
		['suppressed', 'Non envoyé']
	])('says a %s email in a short word', async (status, words) => {
		render(InviteeEmailDelivery, { delivery: delivery(status), variant: 'column' });

		await expect.element(cell()).toHaveAttribute('data-state', status);
		await expect.element(cell()).toHaveTextContent(words);
	});

	it.each(['bounced', 'complained', 'suppressed'])('treats a %s email as a failure to act on', async (status) => {
		render(InviteeEmailDelivery, { delivery: delivery(status), variant: 'column', href: '/web/invite/invitees/u1' });

		const link = page.getByRole('link');
		await expect.element(link).toHaveAttribute('href', '/web/invite/invitees/u1');
		await expect.element(link.getByTestId('invitee-email-delivery-cross')).toBeVisible();
	});

	it('does not flag a delivered email on the compact card', async () => {
		render(InviteeEmailDelivery, { delivery: delivery('delivered') });

		await expect.element(badge()).not.toBeInTheDocument();
	});

	it('flags a deferred one: it may still fail', async () => {
		render(InviteeEmailDelivery, { delivery: delivery('deferred') });

		await expect.element(badge()).toHaveAttribute('data-state', 'deferred');
	});
});

describe('InviteeEmailDelivery says why a failure happened', () => {
	it.each([
		['invalid_request', "corrigez-la"],
		['misconfigured', 'super-administrateur'],
		['rate_limited', 'renvoyez plus tard'],
		['provider_unavailable', 'indisponible'],
		['unreachable', "rien n'est parti"],
		['outcome_unknown', 'peut-être parti']
	])('in words for %s', async (kind, words) => {
		render(InviteeEmailDelivery, { delivery: withKind('failed', kind), variant: 'detail' });

		await expect.element(page.getByTestId('invitee-email-delivery-error')).toHaveTextContent(words);
	});

	it("keeps the service's own words, for whoever digs further", async () => {
		render(InviteeEmailDelivery, { delivery: withKind('failed', 'invalid_request', '400: bad address'), variant: 'detail' });

		await expect.element(page.getByTestId('invitee-email-delivery-raw')).toHaveTextContent('400: bad address');
	});
});

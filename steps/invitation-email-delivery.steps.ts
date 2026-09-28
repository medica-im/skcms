import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';
import { djangoShell, seedInvitee, removeInvitee } from './seed';

const { Given, When, Then, After } = createBdd(test);

type Page = import('@playwright/test').Page;

const seeded: Record<'refused' | 'sent', { uid: string; name: string } | undefined> = {
	refused: undefined,
	sent: undefined
};

After({ tags: '@invitation-email-delivery' }, async () => {
	const uids = Object.values(seeded).flatMap((s) => (s ? [s.uid] : []));
	seeded.refused = seeded.sent = undefined;
	if (!uids.length) return;
	await djangoShell(
		`from mailer.models import EmailDelivery\nEmailDelivery.objects.filter(invitee_uid__in=${JSON.stringify(uids)}).delete()`,
		{ readOnly: true }
	);
	for (const uid of uids) await removeInvitee(uid);
});

/** An invitation, and one recorded attempt at emailing it (mailer.delivery). */
async function invitationWithDelivery(baseURL: string, which: 'refused' | 'sent', fields: string) {
	const name = `Envoi ${which} ${Math.random().toString(36).slice(2, 8)}`;
	const { uid, email } = await seedInvitee({ siteDomain: new URL(baseURL).hostname, name });
	seeded[which] = { uid, name };
	// readOnly: an EmailDelivery is in no cached API payload; the invitations
	// list is read uncached.
	await djangoShell(
		`from mailer.models import EmailDelivery\n` +
			`EmailDelivery.objects.create(invitee_uid=${JSON.stringify(uid)}, to_address=${JSON.stringify(email)}, ${fields})`,
		{ readOnly: true }
	);
}

Given('an invitation whose email was refused with {string}', async ({ baseURL }, error: string) => {
	await invitationWithDelivery(baseURL, 'refused', `status="failed", error=${JSON.stringify(error)}`);
});

Given('an invitation whose email was sent', async ({ baseURL }) => {
	await invitationWithDelivery(baseURL, 'sent', `status="sent", provider_message_id="<e2e@mail.example.org>"`);
});

// Each invitation is rendered twice -- a compact card for narrow screens and
// a row for large ones, one hidden by CSS -- so only the visible one counts.
const row = (page: Page, which: 'refused' | 'sent') =>
	page
		.locator('[data-testid="invitee-card-compact"], .lg\\:grid')
		.filter({ hasText: seeded[which]!.name })
		.filter({ visible: true });

Then('the invitation whose email was refused is flagged {string}', async ({ page }, words: string) => {
	const flag = row(page, 'refused').getByTestId('invitee-email-delivery');
	await expect(flag).toHaveAttribute('data-state', 'failed');
	await expect(flag).toHaveText(words);
});

Then('the invitation whose email was sent carries no email warning', async ({ page }) => {
	await expect(row(page, 'sent')).toBeVisible();
	await expect(row(page, 'sent').getByTestId('invitee-email-delivery')).toHaveCount(0);
});

When('I open the page of the invitation whose email was refused', async ({ page }) => {
	await page.goto(`/web/invite/invitees/${seeded.refused!.uid}`, { waitUntil: 'domcontentloaded' });
});

Then('I read that its email failed with {string}', async ({ page }, error: string) => {
	await expect(page.getByTestId('invitee-email-delivery')).toHaveAttribute('data-state', 'failed');
	await expect(page.getByTestId('invitee-email-delivery-error')).toHaveText(error);
});

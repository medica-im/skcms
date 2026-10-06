import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';
import { djangoShell, removeInvitee, seedInvitee } from './seed';

const { Given, When, Then, After } = createBdd(test);

/** The seeded invitation, and the delivery its email is recorded under. */
const ctx: { uid?: string; email?: string; deliveryId?: string } = {};

After(async () => {
	if (!ctx.uid) return;
	await djangoShell(`
from mailer.models import EmailDelivery
EmailDelivery.objects.filter(invitee_uid=${JSON.stringify(ctx.uid)}).delete()
`);
	await removeInvitee(ctx.uid);
	ctx.uid = ctx.email = ctx.deliveryId = undefined;
});

/**
 * An invitation and its email record as the send path leaves them: queued,
 * then accepted by the mail service. No email actually leaves.
 */
Given('an invitation whose email was just sent', async ({ baseURL }) => {
	const seeded = await seedInvitee({ siteDomain: new URL(baseURL).hostname, name: `Envoi ${Date.now()}` });
	Object.assign(ctx, seeded);
	const out = await djangoShell(`
from mailer.delivery import record_queued, mark_result
row = record_queued(${JSON.stringify(seeded.uid)}, ${JSON.stringify(seeded.email)})
mark_result(row.id, {"id": "<e2e-${seeded.uid}@dev.medica.im>", "message": "Queued. Thank you."})
print("DELIVERY", row.id)
`);
	ctx.deliveryId = out.match(/DELIVERY (\d+)/)?.[1];
	expect(ctx.deliveryId, `recording the delivery failed: ${out}`).toBeTruthy();
});

When('I open the invitations list', async ({ page }) => {
	await page.goto('/web/invite/invitees');
});

/**
 * The large-screen row of that invitation: the innermost visible element
 * holding both its address and an email cell (each invitation is rendered
 * twice, as a compact card and a table row, one hidden by CSS).
 */
const cell = (page: import('@playwright/test').Page) =>
	page
		.locator('div')
		.filter({ hasText: ctx.email! })
		.filter({ has: page.getByTestId('invitee-email-delivery-column') })
		.filter({ visible: true })
		.last()
		.getByTestId('invitee-email-delivery-column');

// Contains, not equals: a failed email's cell is a link whose screen-reader
// text ("— voir le détail de l'invitation") is part of its text.
Then("that invitation's email is shown as {string}", async ({ page }, words: string) => {
	await expect(cell(page)).toContainText(words);
});

/**
 * What the webhook endpoint does once Mailgun's signature checks out: the
 * real apply_event, with the bounce in provider-neutral terms.
 */
When('the mail service reports that the email bounced', async () => {
	await djangoShell(`
import time
from mailer.delivery import apply_event
from mailer.providers.base import DeliveryEvent, EventKind
apply_event(DeliveryEvent(
    provider="mailgun", event_id="e2e-bounce-${ctx.uid}", kind=EventKind.BOUNCED,
    recipient=${JSON.stringify(ctx.email)}, occurred_at=time.time(),
    metadata={"delivery_id": "${ctx.deliveryId}"},
    detail="550 5.1.1 User unknown",
))
`);
});

Then("without reloading, that invitation's email is shown as {string}", async ({ page }, words: string) => {
	// A marker on window dies with a reload: proof the list updated itself.
	await page.evaluate(() => ((window as any).__sameDocument = true));
	await expect(cell(page)).toContainText(words, { timeout: 30_000 });
	expect(await page.evaluate(() => (window as any).__sameDocument)).toBe(true);
});

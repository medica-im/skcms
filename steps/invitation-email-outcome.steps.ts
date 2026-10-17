import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';
import { djangoShell, removeInvitee, seedInvitee } from './seed';

const { Given, When, Then, After } = createBdd(test);

/** The seeded invitation, and the delivery its email is recorded under. */
export const ctx: { uid?: string; email?: string; deliveryId?: string } = {};

After(async () => {
	if (!ctx.uid) return;
	// The bounce also remembered the address (mailer.suppression).
	await djangoShell(`
from mailer.models import EmailDelivery, EmailSuppression
EmailDelivery.objects.filter(invitee_uid=${JSON.stringify(ctx.uid)}).delete()
EmailSuppression.objects.filter(address=${JSON.stringify(ctx.email)}).delete()
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

// The page catches no delivery published before its live stream listens, and
// the backend answers the stream just before subscribing. A real bounce comes
// seconds after the send at the earliest; waiting for the stream, then a
// second's reading, keeps the scenario at that pace.
When('I open the invitations list', async ({ page }) => {
	const listening = page.waitForResponse((r) => r.url().includes('/api/v2/invitees/events'));
	await page.goto('/web/invite/invitees');
	await listening;
	await page.waitForTimeout(1000);
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
async function reportBounce() {
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
}

When('the mail service reports that the email bounced', reportBounce);

// The list's data is fetched before the report and shown after it: the moment
// a stream opened by the list itself would not be listening yet.
When('I go back to the list while the mail service reports that the email was delivered', async ({ page }) => {
	const back = page.getByRole('link', { name: 'Retour aux invitations' });
	await expect(back).toBeVisible();
	// A reader's pace, as on the list.
	await page.waitForTimeout(1000);
	let fetched!: () => void;
	const dataFetched = new Promise<void>((resolve) => (fetched = resolve));
	let release!: () => void;
	const released = new Promise<void>((resolve) => (release = resolve));
	await page.route('**/web/invite/invitees/__data.json*', async (route) => {
		const response = await route.fetch();
		fetched();
		await released;
		await route.fulfill({ response });
	});
	await back.click();
	await dataFetched;
	await reportDelivered();
	release();
	await page.waitForURL('**/web/invite/invitees');
});

Then("without reloading, that invitation's email is shown as {string}", async ({ page }, words: string) => {
	// A marker on window dies with a reload: proof the list updated itself.
	await page.evaluate(() => ((window as any).__sameDocument = true));
	await expect(cell(page)).toContainText(words, { timeout: 30_000 });
	expect(await page.evaluate(() => (window as any).__sameDocument)).toBe(true);
});

When('I open its page', async ({ page }) => {
	await page.goto(`/web/invite/invitees/${ctx.uid}`);
});

Then('its page says its email is {string}', async ({ page }, words: string) => {
	await expect(page.getByTestId('invitee-email-delivery')).toContainText(words);
});

async function reportDelivered() {
	await djangoShell(`
import time
from mailer.delivery import apply_event
from mailer.providers.base import DeliveryEvent, EventKind
apply_event(DeliveryEvent(
    provider="mailgun", event_id="e2e-delivered-${ctx.uid}", kind=EventKind.DELIVERED,
    recipient=${JSON.stringify(ctx.email)}, occurred_at=time.time(),
    metadata={"delivery_id": "${ctx.deliveryId}"},
))
`);
}

When('the mail service reports that the email was delivered', reportDelivered);

Then('without reloading, its page says its email is {string}', async ({ page }, words: string) => {
	await page.evaluate(() => ((window as any).__sameDocument = true));
	await expect(page.getByTestId('invitee-email-delivery')).toContainText(words, { timeout: 30_000 });
	expect(await page.evaluate(() => (window as any).__sameDocument)).toBe(true);
});

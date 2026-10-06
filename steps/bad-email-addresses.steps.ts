import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';
import { djangoShell, removeInvitee, seedInvitee } from './seed';
import { ctx } from './invitation-email-outcome.steps';

const { Given, When, Then, After } = createBdd(test);

type Page = import('@playwright/test').Page;

/** What these scenarios seed beyond invitation-email-outcome's ctx. */
const own: { uid?: string; email?: string; jobUid?: string } = {};

After(async () => {
	const emails = [own.email, ctx.email].filter(Boolean);
	if (emails.length) {
		await djangoShell(`
from mailer.models import EmailSuppression
EmailSuppression.objects.filter(address__in=${JSON.stringify(emails)}).delete()
`);
	}
	if (own.jobUid) {
		await djangoShell(`
from access.models import BatchInviteeJob
BatchInviteeJob.objects.filter(uid=${JSON.stringify(own.jobUid)}).delete()
`);
	}
	if (own.uid) {
		await djangoShell(`
from mailer.models import EmailDelivery
EmailDelivery.objects.filter(invitee_uid=${JSON.stringify(own.uid)}).delete()
`);
		await removeInvitee(own.uid);
	}
	own.uid = own.email = own.jobUid = undefined;
});

/** The visible large-screen row holding this address (see invitation-email-outcome). */
const row = (page: Page, email: string) =>
	page
		.locator('div')
		.filter({ hasText: email })
		.filter({ has: page.getByTestId('invitee-email-delivery-column') })
		.filter({ visible: true })
		.last();

Then("that invitation's address is flagged {string}", async ({ page }, reason: string) => {
	const flag = row(page, ctx.email!).getByTestId('invitee-address-flag');
	await expect(flag).toBeVisible({ timeout: 30_000 });
	await expect(flag).toHaveAttribute('title', reason);
});

Then('a banner says {string}', async ({ page }, words: string) => {
	await expect(page.getByTestId('invitee-check-banner')).toContainText(words);
});

When('I show only the addresses to check', async ({ page }) => {
	await page.getByTestId('invitee-check-banner').getByRole('button').click();
	await expect(page).toHaveURL(/statut=a-verifier/);
});

Then('that invitation is listed under {string}', async ({ page }, filter: string) => {
	await expect(page.getByRole('button', { name: new RegExp(filter) })).toHaveAttribute('aria-pressed', 'true');
	await expect(row(page, ctx.email!)).toBeVisible();
});

/** An invitation whose email bounced, and the address remembered for it. */
async function bouncedInvitation(baseURL: string, batchJobUid: string | null = null) {
	const seeded = await seedInvitee({ siteDomain: new URL(baseURL).hostname, name: `Rejet ${Date.now()}` });
	Object.assign(own, seeded);
	await djangoShell(`
from mailer import suppression
from mailer.models import EmailDelivery
row = EmailDelivery.objects.create(
    invitee_uid=${JSON.stringify(seeded.uid)}, to_address=${JSON.stringify(seeded.email)},
    status="bounced", error="550 5.1.1 User unknown", batch_job_uid=${batchJobUid ? JSON.stringify(batchJobUid) : 'None'},
)
suppression.record(${JSON.stringify(seeded.email)}, "bounced", detail="550 5.1.1 User unknown")
`);
	return seeded;
}

Given('an invitation whose address bounced before', async ({ baseURL }) => {
	await bouncedInvitation(baseURL);
});

When("I open that invitation's page", async ({ page }) => {
	await page.goto(`/web/invite/invitees/${own.uid}`);
});

Then('I read {string}', async ({ page }, words: string) => {
	await expect(page.getByTestId('invitee-address-problem')).toContainText(words);
});

// Clicked until something answers: a click before hydration reaches no handler.
When('I send the invitation again', async ({ page }) => {
	const button = page.getByRole('button', { name: "Renvoyer l'invitation" });
	await expect(async () => {
		await button.click();
		await expect(
			page.getByTestId('invitee-resend-confirm').or(page.getByTestId('invitee-resend-outcome'))
		).toBeVisible({ timeout: 2_000 });
	}).toPass({ timeout: 20_000 });
});

Then('I am asked {string} and nothing is sent', async ({ page }, question: string) => {
	await expect(page.getByTestId('invitee-resend-confirm')).toContainText(question);
	const out = await djangoShell(
		`from mailer.models import EmailDelivery\nprint("count", EmailDelivery.objects.filter(invitee_uid=${JSON.stringify(own.uid)}).count())`,
		{ readOnly: true }
	);
	expect(out).toContain('count 1');
});

Given("a batch whose invitation's email bounced", async ({ baseURL }) => {
	const host = new URL(baseURL).hostname;
	const out = await djangoShell(`
import uuid
from access.models import BatchInviteeJob
from facility.models import Organization
org = Organization.objects.get(site__domain=${JSON.stringify(host)})
job = BatchInviteeJob.objects.create(
    organization_neomodel_uid=org.neomodel_uid, user_uid="e2e", total_rows=1, processed_rows=1,
    role="staff", send_emails=True, status=BatchInviteeJob.Status.COMPLETED,
)
print("JOB", job.uid)
`);
	own.jobUid = out.match(/JOB (\S+)/)?.[1];
	expect(own.jobUid, `creating the batch job failed: ${out}`).toBeTruthy();
	const seeded = await bouncedInvitation(baseURL, own.jobUid!);
	await djangoShell(`
from access.models import BatchInviteeJob
BatchInviteeJob.objects.filter(uid=${JSON.stringify(own.jobUid)}).update(summary=[{
    "row": 1, "name": "", "email": ${JSON.stringify(seeded.email)}, "status": "created",
    "message": "", "invitee_uid": ${JSON.stringify(seeded.uid)}, "existing_invitee_uid": None,
}])
`);
});

When("I open that batch's report", async ({ page }) => {
	await page.goto(`/web/invite/batch-logs/${own.jobUid}`);
});

Then('the report counts {int} address to check', async ({ page }, count: number) => {
	await expect(page.getByTestId('batch-check-count')).toContainText(String(count));
});

Then("that invitation's address is flagged in the report", async ({ page }) => {
	const cell = page.getByRole('row').filter({ hasText: own.email! });
	await expect(cell.getByTestId('invitee-address-flag')).toBeVisible();
});

const addressField = (page: Page) => page.getByPlaceholder('utilisateur@example.com');

// Typed until the field holds it: before hydration the value is lost.
When('I type the invitation address {string}', async ({ page }, address: string) => {
	await expect(async () => {
		await addressField(page).fill(address);
		await expect(page.getByTestId('address-check-hint')).toBeVisible({ timeout: 3_000 });
	}).toPass({ timeout: 20_000 });
});

Then('I am asked whether I meant {string}', async ({ page }, suggestion: string) => {
	await expect(page.getByTestId('address-check-hint').getByRole('button', { name: suggestion })).toBeVisible();
});

When('I accept the suggestion', async ({ page }) => {
	await page.getByTestId('address-check-hint').getByRole('button').click();
});

Then('the address reads {string}', async ({ page }, address: string) => {
	await expect(addressField(page)).toHaveValue(address);
});

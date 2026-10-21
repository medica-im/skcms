import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';
import { djangoShell, seedInvitees, removeInvitees } from './seed';

const { Given, When, Then, After } = createBdd(test);

type Page = import('@playwright/test').Page;

/** Who created a seeded job: what tells it from one a scenario started. */
const SEEDED_BY = 'e2e-seed';

let prefix = '';
let invitees: { uid: string; email: string; name: string }[] = [];
let jobUids: string[] = [];
let startedAt = '';
let rememberedLabel = '';

After({ tags: '@invitations-bulk-resend' }, async () => {
	const uids = invitees.map((i) => i.uid);
	const jobs = jobUids;
	invitees = [];
	jobUids = [];
	if (uids.length) {
		await djangoShell(
			`from mailer.models import EmailDelivery\nEmailDelivery.objects.filter(invitee_uid__in=${JSON.stringify(uids)}).delete()`,
			{ readOnly: true }
		);
		await removeInvitees(uids);
	}
	if (jobs.length) {
		await djangoShell(
			`from access.models import BatchInviteeJob\nBatchInviteeJob.objects.filter(uid__in=${JSON.stringify(jobs)}).delete()`,
			{ readOnly: true }
		);
	}
});

const ordinal = { first: 0, second: 1 } as const;
type Ordinal = keyof typeof ordinal;

Given('{int} pending invitations of my own', async ({ baseURL }, count: number) => {
	prefix = `Relance ${Math.random().toString(36).slice(2, 8)}`;
	startedAt = new Date().toISOString();
	invitees = await seedInvitees({ siteDomain: new URL(baseURL).hostname, prefix, count });
	invitees.sort((a, b) => a.name.localeCompare(b.name));
});

/** One recorded attempt at emailing an invitation (mailer.delivery), dated. */
async function delivery(which: Ordinal, status: string, daysAgo: number) {
	const invitee = invitees[ordinal[which]];
	await djangoShell(
		`from datetime import timedelta\n` +
			`from django.utils import timezone\n` +
			`from mailer.models import EmailDelivery\n` +
			`row = EmailDelivery.objects.create(invitee_uid=${JSON.stringify(invitee.uid)}, to_address=${JSON.stringify(invitee.email)}, status=${JSON.stringify(status)})\n` +
			`at = timezone.now() - timedelta(days=${daysAgo})\n` +
			`EmailDelivery.objects.filter(id=row.id).update(created=at, updated=at)`,
		{ readOnly: true }
	);
}

Given('the {word} of them was emailed {int} days ago', async ({}, which: Ordinal, days: number) => {
	await delivery(which, 'delivered', days);
});

Given('the {word} of them has an email on its way', async ({}, which: Ordinal) => {
	await delivery(which, 'queued', 0);
});

/** A reminder job of the worker site's organization, as the task leaves it. */
async function seedJob(baseURL: string, fields: string) {
	const out = await djangoShell(
		`from access.models import BatchInviteeJob\n` +
			`from facility.models import Organization\n` +
			`org = Organization.objects.get(site__domain=${JSON.stringify(new URL(baseURL).hostname)})\n` +
			`job = BatchInviteeJob.objects.create(organization_neomodel_uid=org.neomodel_uid, user_uid=${JSON.stringify(SEEDED_BY)}, ` +
			`role="", send_emails=True, kind="resend", phase="sending", ${fields})\n` +
			`print("JOB_SEEDED", job.uid)`,
		{ readOnly: true }
	);
	const match = out.match(/JOB_SEEDED (\S+)/);
	if (!match) throw new Error(`seeding job failed: ${out}`);
	jobUids.push(match[1]);
}

Given(
	'a reminder of my organization is running, {int} emails of {int} sent',
	async ({ baseURL }, done: number, total: number) => {
		await seedJob(baseURL, `status="processing", total_rows=${total}, emails_total=${total}, emails_processed=${done}`);
	}
);

Given(
	'a reminder of my organization finished with {int} sent, {int} skipped and {int} failed',
	async ({ baseURL }, sent: number, skipped: number, failed: number) => {
		const total = sent + skipped + failed;
		await seedJob(
			baseURL,
			`status="completed", total_rows=${total}, emails_total=${total}, emails_processed=${total}, ` +
				`email_skipped_count=${skipped}, failed_email_count=${failed}`
		);
	}
);

When('I search for my invitations', async ({ page }) => {
	await page.locator('input[type="search"]').fill(prefix);
	await expect(page.getByText(invitees[0].name, { exact: true }).filter({ visible: true })).toBeVisible();
});

const resendButton = (page: Page) => page.getByRole('button', { name: 'Relancer', exact: true });

// Clicked until something answers: a click before hydration reaches no handler.
When('I start a reminder', async ({ page }) => {
	await expect(async () => {
		await resendButton(page).click();
		await expect(page.getByTestId('resend-bar')).toBeVisible({ timeout: 1000 });
	}).toPass();
});

const checkbox = (page: Page, email: string) => page.getByRole('checkbox', { name: `Relancer ${email}` });
const row = (page: Page, email: string) => page.getByTestId('resend-row').filter({ has: checkbox(page, email) });

Then('the {word} of them is not ticked and reads {string}', async ({ page }, which: Ordinal, words: string) => {
	const { email } = invitees[ordinal[which]];
	await expect(checkbox(page, email)).not.toBeChecked();
	await expect(checkbox(page, email)).toBeEnabled();
	await expect(row(page, email).getByTestId('resend-reason')).toContainText(words);
});

Then('the {word} of them is ticked', async ({ page }, which: Ordinal) => {
	await expect(checkbox(page, invitees[ordinal[which]].email)).toBeChecked();
});

Then('the {word} of them cannot be ticked and reads {string}', async ({ page }, which: Ordinal, words: string) => {
	const { email } = invitees[ordinal[which]];
	await expect(checkbox(page, email)).toBeDisabled();
	await expect(checkbox(page, email)).not.toBeChecked();
	await expect(row(page, email).getByTestId('resend-reason')).toContainText(words);
});

When('I untick the first invitation of the page', async ({ page }) => {
	const box = page.getByTestId('resend-row').first().getByRole('checkbox');
	rememberedLabel = (await box.getAttribute('aria-label')) ?? '';
	await box.uncheck();
	await expect(box).not.toBeChecked();
});

When('I go to the next page', async ({ page }) => {
	await page.getByRole('button', { name: 'Suivant' }).click();
	await expect(page.getByText('Page 2 / 2')).toBeVisible();
});

When('I go back to the previous page', async ({ page }) => {
	await page.getByRole('button', { name: 'Précédent' }).click();
	await expect(page.getByText('Page 1 / 2')).toBeVisible();
});

Then('that invitation is still unticked', async ({ page }) => {
	await expect(page.getByRole('checkbox', { name: rememberedLabel })).not.toBeChecked();
});

When('I untick everything', async ({ page }) => {
	await page.getByRole('button', { name: 'Tout désélectionner' }).click();
});

When('I tick the first and the second of them', async ({ page }) => {
	for (const invitee of invitees.slice(0, 2)) await checkbox(page, invitee.email).check();
});

When('I ask to send', async ({ page }) => {
	await page.getByTestId('resend-bar').getByRole('button', { name: /^Renvoyer \(/ }).click();
});

Then('the confirmation reads {string}', async ({ page }, words: string) => {
	await expect(page.getByTestId('resend-confirm')).toContainText(words);
});

When('I cancel the confirmation', async ({ page }) => {
	await page.getByTestId('resend-confirm').getByRole('button', { name: 'Annuler' }).click();
	await expect(page.getByTestId('resend-confirm')).not.toBeVisible();
});

Then('no reminder was started', async ({ baseURL }) => {
	const out = await djangoShell(
		`from access.models import BatchInviteeJob\n` +
			`from facility.models import Organization\n` +
			`org = Organization.objects.get(site__domain=${JSON.stringify(new URL(baseURL).hostname)})\n` +
			`print("STARTED", BatchInviteeJob.objects.filter(organization_neomodel_uid=org.neomodel_uid, kind="resend", ` +
			`created_at__gte=${JSON.stringify(startedAt)}).exclude(user_uid=${JSON.stringify(SEEDED_BY)}).count())`,
		{ readOnly: true }
	);
	expect(out).toContain('STARTED 0');
});

Then('I see the reminder at {string}', async ({ page }, count: string) => {
	await expect(page.getByTestId('resend-running')).toBeVisible();
	await expect(page.getByTestId('batch-progress-count')).toHaveText(count);
});

Then('I cannot start another reminder', async ({ page }) => {
	await expect(resendButton(page)).toBeDisabled();
});

Then("the reminder's summary reads {string}", async ({ page }, words: string) => {
	await expect(page.getByTestId('resend-summary')).toContainText(words);
});

// Clicked until it goes: a click before hydration reaches no handler. The
// alert asks the browser to confirm, every time it is answered.
When("I close the reminder's summary", async ({ page }) => {
	page.on('dialog', (dialog) => dialog.accept());
	const close = page
		.locator('.dismissible-alert')
		.filter({ has: page.getByTestId('resend-summary') })
		.getByRole('button', { name: 'Fermer' });
	await expect(async () => {
		await close.click();
		await expect(page.getByTestId('resend-summary')).not.toBeVisible({ timeout: 1000 });
	}).toPass();
});

const reportLink = (page: Page) => page.locator(`a[href$="/web/invite/batch-logs/${jobUids.at(-1)}"]`);

Then('the reminder is listed with {int} sent', async ({ page }, sent: number) => {
	const row = page.getByTestId('reminder-logs').locator('tr').filter({ has: reportLink(page) });
	await expect(row).toBeVisible();
	await expect(row.locator('td').nth(3)).toHaveText(String(sent));
});

When("I open the reminder's report", async ({ page }) => {
	await reportLink(page).click();
	await expect(page).toHaveURL(new RegExp(`/web/invite/batch-logs/${jobUids.at(-1)}$`));
});

Then('its way back reads {string}', async ({ page }, words: string) => {
	await expect(page.getByRole('link', { name: words })).toHaveAttribute('href', /\/web\/invite\/reminder-logs$/);
});

Then('the reminder is not listed', async ({ page }) => {
	await expect(page.getByRole('heading', { name: 'Historique des créations en masse' })).toBeVisible();
	await expect(reportLink(page)).toHaveCount(0);
});

Then("the reminder's summary is gone", async ({ page }) => {
	await expect(page.getByRole('heading', { name: 'Invitations' }).first()).toBeVisible();
	await expect(page.getByTestId('resend-summary')).toHaveCount(0);
});

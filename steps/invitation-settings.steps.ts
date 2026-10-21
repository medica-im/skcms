import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';
import { djangoShell } from './seed';

const { When, Then, After } = createBdd(test);

/** The organization's own value before the scenario changed it, to put back. */
let restore: { siteDomain: string; days: number } | undefined;

After({ tags: '@invitation-settings' }, async () => {
	if (!restore) return;
	const { siteDomain, days } = restore;
	restore = undefined;
	await djangoShell(
		`from facility.models import Organization\n` +
			`Organization.objects.filter(site__domain=${JSON.stringify(siteDomain)}).update(invitation_resend_after_days=${days})`
	);
});

When('I set the days before a reminder to {int} and save', async ({ page, baseURL }, days: number) => {
	const siteDomain = new URL(baseURL).hostname;
	const out = await djangoShell(
		`from facility.models import Organization\n` +
			`print("DAYS", Organization.objects.get(site__domain=${JSON.stringify(siteDomain)}).invitation_resend_after_days)`,
		{ readOnly: true }
	);
	restore = { siteDomain, days: Number(out.match(/DAYS (\d+)/)![1]) };

	const input = page.getByRole('spinbutton', { name: 'Délai avant relance, en jours' });
	const save = page.getByRole('button', { name: 'Enregistrer' });
	// Filled until the button answers: a value typed before hydration
	// reaches no handler, and the button stays disabled.
	await expect(async () => {
		await input.fill(String(days));
		await expect(save).toBeEnabled({ timeout: 1000 });
	}).toPass();
	await save.click();
});

Then('the settings are saved', async ({ page }) => {
	await expect(page.getByTestId('settings-saved')).toContainText('Réglages enregistrés.');
});

Then('the reminder mode of the invitations list says {string}', async ({ page }, words: string) => {
	await page.goto('/web/invite/invitees');
	const start = page.getByRole('button', { name: 'Relancer', exact: true });
	await expect(async () => {
		await start.click();
		await expect(page.getByTestId('resend-mode')).toBeVisible({ timeout: 1000 });
	}).toPass();
	await expect(page.getByTestId('resend-mode')).toContainText(words);
});

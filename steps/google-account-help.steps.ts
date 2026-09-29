import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';

const { When, Then } = createBdd(test);

// "I am signed out" lives in common.steps.ts, "I open {string}" in
// invitees-admin-only.steps.ts and "I browse on a phone" in
// invitees-order.steps.ts — playwright-bdd rejects duplicate definitions.

When('I follow the Google account help link', async ({ page }) => {
	await page.getByTestId('google-account-help-link').click();
});

Then('I am on the Google account help page', async ({ page }) => {
	await expect(page).toHaveURL(/\/compte-google$/);
	await expect(page.getByTestId('google-account-help')).toBeVisible();
});

// The messages are located by test id rather than by their wording, so the
// French can be reworded without touching the tests; each check still
// requires a key term, so an emptied section fails.

Then('the page says an invitation is bound to a single email address', async ({ page }) => {
	await expect(page.getByTestId('one-invitation-one-address')).toContainText('une seule adresse');
});

Then('the page says a Google account is not a Gmail mailbox', async ({ page }) => {
	await expect(page.getByTestId('google-account-not-gmail')).toContainText('Gmail');
});

Then('the page names the {string} button', async ({ page }, label: string) => {
	await expect(page.getByTestId('existing-address-step')).toContainText(label);
});

Then('the page explains that another address needs a new invitation', async ({ page }) => {
	await expect(page.getByTestId('other-address')).toContainText('nouvelle invitation');
});

Then('the page does not scroll sideways', async ({ page }) => {
	const overflow = await page.evaluate(
		() => document.documentElement.scrollWidth - document.documentElement.clientWidth
	);
	expect(overflow).toBeLessThanOrEqual(0);
});

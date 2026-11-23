import { createBdd } from 'playwright-bdd';
import { test, expect } from './fixtures';
import { ctx as creation } from './entry-creation-flow.steps';

const { When, Then } = createBdd(test);

When("I look at that entry's facility", async ({ page }) => {
	await page.goto(`/sites/${creation.facilityUid}`, { waitUntil: 'networkidle' });
});

Then('the facility shows a secretariat', async ({ page }) => {
	await expect(page.getByTestId('facility-secretariat')).toBeVisible({ timeout: 15_000 });
});

Then('the facility shows no secretariat', async ({ page }) => {
	await expect(page.getByRole('heading', { level: 1 }).or(page.locator('main')).first()).toBeVisible();
	await expect(page.getByTestId('facility-secretariat')).toHaveCount(0);
});

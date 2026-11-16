import { createBdd } from 'playwright-bdd';
import { test, expect } from './fixtures';
import { ctx } from './entry-effector-type-edit.steps';

const { When, Then } = createBdd(test);

// The person, the facility and the entry, signing in, edit mode and the description widget are
// the creation-flow, type-edit and description steps' (the feature carries their tags).

const box = (page: import('@playwright/test').Page) => page.getByTestId('entry-quality');

Then('the quality box says {string}', async ({ page }, text: string) => {
	await expect(box(page)).toContainText(text, { timeout: 15_000 });
});

Then('the quality box no longer says {string}', async ({ page }, text: string) => {
	await expect(box(page)).not.toContainText(text, { timeout: 15_000 });
});

Then('there is no quality box', async ({ page }) => {
	await expect(box(page)).toHaveCount(0);
});

When('I look at that entry without editing', async ({ page }) => {
	await page.goto(`/e/${ctx.slug}`, { waitUntil: 'networkidle' });
	await expect(page.getByRole('switch').first()).toBeVisible({ timeout: 8_000 });
});

When('I open the quality report', async ({ page }) => {
	await page.goto('/web/quality', { waitUntil: 'networkidle' });
});

Then('the report lists that entry under {string}', async ({ page }, rule: string) => {
	const card = page.getByRole('listitem').filter({ hasText: rule }).first();
	await expect(card).toBeVisible({ timeout: 15_000 });
	await expect(card.locator(`a[href$="/e/${ctx.slug}"]`)).toHaveCount(1);
});

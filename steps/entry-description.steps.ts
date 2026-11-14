import { createBdd } from 'playwright-bdd';
import { test, expect } from './fixtures';

const { When, Then } = createBdd(test);

// The person, the facility and the entry, signing in and edit mode are the
// creation-flow and type-edit steps' (the feature carries their tags).

When('I write the description {string}', async ({ page }, text: string) => {
	const dialog = page.getByTestId('entry-description-dialog');
	await expect(async () => {
		await page.getByTestId('entry-description-edit').click();
		await expect(dialog).toBeVisible({ timeout: 2_000 });
	}).toPass({ timeout: 20_000 });
	await dialog.getByRole('textbox').fill(text);
	await dialog.getByTestId('entry-description-save').click();
	await expect(dialog).toBeHidden({ timeout: 15_000 });
});

Then('the page shows the description {string}', async ({ page }, text: string) => {
	await page.reload({ waitUntil: 'networkidle' });
	await expect(page.getByTestId('entry-description')).toHaveText(text);
});

Then('the page shows no description', async ({ page }) => {
	await page.reload({ waitUntil: 'networkidle' });
	await expect(page.getByTestId('entry-description')).toHaveCount(0);
});

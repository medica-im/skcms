import type { Page } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test, expect } from './fixtures';

const { When, Then } = createBdd(test);

// The person, the facility and the entry, signing in, edit mode and looking without editing are
// the creation-flow, type-edit, slug-edit and quality steps' (the feature carries their tags).

const dialog = (page: Page) => page.getByTestId('entry-coverage-dialog');

async function openDialog(page: Page) {
	if (await dialog(page).isVisible()) return;
	await expect(async () => {
		await page.getByTestId('entry-coverage-edit').click();
		await expect(dialog(page)).toBeVisible({ timeout: 2_000 });
	}).toPass({ timeout: 20_000 });
}

When('I add {string} to the area covered', async ({ page }, place: string) => {
	await openDialog(page);
	// Typed as a person would: the name, without the code that tells homonyms apart.
	await dialog(page).getByRole('searchbox').fill(place.replace(/\s*\(.*\)$/, ''));
	const result = page.getByTestId('entry-coverage-found').getByRole('button', { name: place });
	await result.first().click({ timeout: 8_000 });
	await expect(dialog(page).getByRole('button', { name: new RegExp(`${place.replace(/[()]/g, '\\$&')}$`) })).toBeVisible();
});

When('I save the area covered', async ({ page }) => {
	await dialog(page).getByTestId('entry-coverage-save').click();
	await expect(dialog(page)).toBeHidden({ timeout: 15_000 });
});

Then('the area covered reads {string}', async ({ page }, places: string) => {
	const list = page.getByRole('list', { name: 'Zone couverte' });
	await expect(list.getByRole('listitem')).toHaveText(places.split(', '), { timeout: 15_000 });
});

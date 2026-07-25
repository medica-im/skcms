import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Given, Then } = createBdd();

Given('I am on the home page', async ({ page }) => {
	await page.goto('/');
});

Then('the page has a non-empty title', async ({ page }) => {
	const title = await page.title();
	expect(title.trim().length).toBeGreaterThan(0);
});

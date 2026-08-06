import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';

const { Given, When, Then } = createBdd(test);

const DISMISSED_KEY = 'heatwave-alert-dismissed-until';

const banner = (page: import('@playwright/test').Page) =>
	page.getByTestId('heatwave-alert');
const closeButton = (page: import('@playwright/test').Page) =>
	page.getByTestId('heatwave-alert-close');

/**
 * The banner only renders while Météo France reports a running alert, so the
 * warning endpoint is stubbed with one that ends well in the future. This keeps
 * the scenarios runnable whatever the real weather is doing.
 */
Given('a heatwave alert is in progress', async ({ page }) => {
	const endTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
	const startTime = new Date(Date.now() - 60 * 60 * 1000).toISOString();
	await page.route('**/api/v1/heatwave/warning/**', (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ start_time: startTime, end_time: endTime, risk_code: '3' })
		})
	);
});

// "I open the home page" is defined once in avatar-access.steps.ts —
// playwright-bdd matches on step text regardless of the keyword.

When('I close the heatwave banner', async ({ page }) => {
	await expect(banner(page)).toBeVisible({ timeout: 20_000 });
	await closeButton(page).click();
});

When('I reload the page', async ({ page }) => {
	await page.reload({ waitUntil: 'networkidle' });
});

/**
 * Rewinds the stored expiry instead of waiting, so the scenario runs in
 * milliseconds. This exercises the real expiry check rather than a test hook.
 */
When('an hour has passed', async ({ page }) => {
	await page.evaluate((key) => {
		const until = Number(window.localStorage.getItem(key));
		if (until) window.localStorage.setItem(key, String(until - 60 * 60 * 1000 - 1000));
	}, DISMISSED_KEY);
});

When('{int} minutes have passed', async ({ page }, minutes: number) => {
	await page.evaluate(
		({ key, minutes }) => {
			const until = Number(window.localStorage.getItem(key));
			if (until) window.localStorage.setItem(key, String(until - minutes * 60 * 1000));
		},
		{ key: DISMISSED_KEY, minutes }
	);
});

Then('the heatwave banner is visible', async ({ page }) => {
	await expect(banner(page)).toBeVisible({ timeout: 20_000 });
});

Then('the heatwave banner is not visible', async ({ page }) => {
	await expect(banner(page)).toBeHidden();
});

/**
 * The placeholder only exists in dev builds, so this asserts it never appears
 * rather than that it disappears — catching a flash between load and dismissal.
 */
Then('no heatwave loading placeholder is shown', async ({ page }) => {
	await expect(page.getByTestId('heatwave-alert-loading')).toHaveCount(0);
});

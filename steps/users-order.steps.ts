import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';

const { When, Then } = createBdd(test);

type Page = import('@playwright/test').Page;

/**
 * The creation date of every listed user, top to bottom, from the rows'
 * <time datetime> (ListDateTime). Undated users have no <time>, so they drop
 * out here -- which is right: they sort last both ways and say nothing about
 * the order.
 */
async function listedDates(page: Page): Promise<number[]> {
	await expect(page.locator('main time[datetime]').first()).toBeVisible();
	const values = await page.locator('main time[datetime]').evaluateAll((els) =>
		els.map((el) => el.getAttribute('datetime')!)
	);
	return values.map((v) => Date.parse(v));
}

const isSorted = (dates: number[], direction: 'asc' | 'desc') =>
	dates.every((d, i) => i === 0 || (direction === 'asc' ? dates[i - 1] <= d : dates[i - 1] >= d));

Then('the users are listed newest first', async ({ page }) => {
	const dates = await listedDates(page);
	expect(dates.length, 'fewer than two dated users: the order proves nothing').toBeGreaterThan(1);
	expect(isSorted(dates, 'desc')).toBe(true);
});

Then('the users are listed oldest first', async ({ page }) => {
	await expect.poll(async () => isSorted(await listedDates(page), 'asc')).toBe(true);
});

// Clicked until the sort icon turns: a click before hydration does nothing
// (see setSwitch in facilityContext.ts).
When('I sort the users by creation date', async ({ page }) => {
	const header = page.getByRole('button', { name: /^Création/ });
	const icon = header.getByTestId('sort-icon');
	await expect(async () => {
		if ((await icon.getAttribute('data-direction')) !== 'asc') await header.click();
		await expect(icon).toHaveAttribute('data-direction', 'asc', { timeout: 1_000 });
	}).toPass({ timeout: 8_000 });
});

// Goes through the other value first: re-choosing the value shown fires no
// change, and a choice made before hydration reaches no handler.
When('I choose to see the oldest users first', async ({ page }) => {
	const sort = page.getByLabel('Trier');
	await expect(async () => {
		await sort.selectOption({ label: "Plus récents d'abord" });
		await sort.selectOption({ label: "Plus anciens d'abord" });
		expect(isSorted(await listedDates(page), 'asc')).toBe(true);
	}).toPass({ timeout: 8_000 });
});

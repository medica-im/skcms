import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';

const { When, Then } = createBdd(test);

/** Row count before the search, for the comparison below. */
let rowsBeforeSearch = 0;

// "I am signed out", "I am signed in with the role ..." and "I open {string}"
// are defined in common.steps.ts and invitees-admin-only.steps.ts;
// playwright-bdd forbids duplicates.

// The existing "I am redirected to the sign-in page" hardcodes the invitees
// path, so this one names the route it came from.
Then('I am redirected to sign in for {string}', async ({ page }, path: string) => {
	await expect(page).toHaveURL(new RegExp(`/signin\\?redirect=${path.replace(/\//g, '\\/')}`));
});

Then('the entries table is shown', async ({ page }) => {
	// The page renders client-side (ssr = false), so the table appears after
	// hydration and the load — waiting for the element is the assertion.
	await expect(page.getByRole('table')).toBeVisible({ timeout: 15_000 });
});

Then('the table lists at least one entry', async ({ page }) => {
	// A table with a header and no rows is what an empty payload looks like,
	// and it is indistinguishable from a broken fetch unless something counts.
	const rows = page.locator('tbody tr');
	await expect.poll(() => rows.count(), { timeout: 15_000 }).toBeGreaterThan(0);
});

Then('the entries table has a {string} column', async ({ page }, label: string) => {
	await expect(page.getByRole('columnheader', { name: new RegExp(label) })).toBeVisible({
		timeout: 15_000
	});
});

Then('the summary shows a total count', async ({ page }) => {
	await expect(page.getByText(/\d+ entrées/)).toBeVisible({ timeout: 15_000 });
});

When('I search the entries for {string}', async ({ page }, term: string) => {
	// input[type="search"], not the first text input: the commune, category
	// and facility selectors are text inputs too, and filling one of those
	// silently tests nothing.
	await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 15_000 });
	rowsBeforeSearch = await page.locator('tbody tr').count();
	await page.locator('input[type="search"]').first().fill(term);
});

Then('the table lists fewer entries than before', async ({ page }) => {
	await expect
		.poll(() => page.locator('tbody tr').count(), { timeout: 15_000 })
		.toBeLessThan(rowsBeforeSearch);
});

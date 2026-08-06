import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';

const { When, Then } = createBdd(test);

const INVITEES_PATH = '/web/invite/invitees';

/** Per-scenario state. */
const ctx: { status?: number } = {};

// "I am signed out" and "I am signed in with the role ..." live in common.steps.ts,
// since both feature files use them and playwright-bdd forbids duplicates.

// Note: "Given I am on the home page" is defined once in home.steps.ts and
// reused here — playwright-bdd rejects duplicate step definitions.

When('I open {string}', async ({ page }, path: string) => {
	const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
	ctx.status = response?.status();
});

When('I open {string} directly', async ({ page }, path: string) => {
	// A plain goto with no prior in-app navigation sends no referrer, which is
	// what "opened directly" (deep link, bookmark, new tab) means here.
	const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
	ctx.status = response?.status();
});

When('I follow a link to {string}', async ({ page }, path: string) => {
	// Navigating from within the site sets a same-origin referrer.
	const response = await page.goto(path, {
		waitUntil: 'domcontentloaded',
		referer: new URL('/', page.url()).toString()
	});
	ctx.status = response?.status();
});

Then('I am redirected to the sign-in page', async ({ page }) => {
	await expect(page).toHaveURL(
		new RegExp(`/signin\\?redirect=${INVITEES_PATH.replace(/\//g, '\\/')}`)
	);
});

Then('the response status is {int}', async ({}, status: number) => {
	expect(ctx.status).toBe(status);
});

Then('I see a message explaining the page is reserved for administrators', async ({ page }) => {
	await expect(page.getByText(/réservée aux administrateurs/i).first()).toBeVisible();
});

Then('the list of invitees is not rendered', async ({ page }) => {
	await expect(page.getByRole('button', { name: /Créer une invitation/i })).toHaveCount(0);
});

/**
 * The site footer carries its own "Accueil" link, so an unscoped locator matches
 * two elements and Playwright's strict mode rejects it. The scenario is about the
 * way out that the error page itself offers, so look only inside that page.
 */
const errorPage = (page: import('@playwright/test').Page) =>
	page.locator('.section-container').filter({ has: page.getByRole('heading', { level: 1 }) });

Then('I see a link to the home page', async ({ page }) => {
	await expect(errorPage(page).getByRole('link', { name: /Accueil/i })).toBeVisible();
});

// The Back button is added by an $effect after hydration, so wait for the page
// to settle before asserting either way — otherwise the negative assertion can
// pass simply because hydration has not run yet.
async function backButton(page: import('@playwright/test').Page) {
	await expect(errorPage(page).getByRole('link', { name: /Accueil/i })).toBeVisible();
	return errorPage(page).getByRole('button', { name: /Retour/i });
}

Then('I see a {string} control', async ({ page }, label: string) => {
	expect(label).toBe('back');
	await expect(await backButton(page)).toBeVisible({ timeout: 15_000 });
});

Then('I do not see a {string} control', async ({ page }, label: string) => {
	expect(label).toBe('back');
	const button = await backButton(page);
	// Give hydration a chance to add it, then confirm it stayed absent.
	await page.waitForTimeout(1500);
	await expect(button).toHaveCount(0);
});

Then('the invitees page is displayed', async ({ page }) => {
	expect(ctx.status).toBe(200);
	await expect(page.getByRole('heading', { name: /Invitations/i })).toBeVisible();
});

import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';

const { Given } = createBdd(test);

// features/home.feature is gone: it was the playwright-bdd wiring example
// ("the page has a non-empty title"), which asserted nothing about the product
// and would have passed on a title of "x". What the home page actually has to
// do is covered by team-carousel, heatwave-banner, occupation-labels and
// facility-rename.
//
// This file stays for the one step the example left behind:
// invitees-admin-only.feature uses it to reach the site before following a
// link, and playwright-bdd rejects duplicate definitions, so it has to live in
// exactly one place.
Given('I am on the home page', async ({ page }) => {
	await page.goto('/');
});

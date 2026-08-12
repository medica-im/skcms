import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';

const { Given, Then } = createBdd(test);

const openDialog = (page: import('@playwright/test').Page) => page.locator('dialog[open]');

/**
 * The alpha of an element's computed background colour.
 *
 * `getComputedStyle(el, '::backdrop')` is what makes this measurable at all:
 * the backdrop is a pseudo-element with no node of its own, so nothing can be
 * located or screenshotted directly. A browser default is transparent, which
 * reads here as alpha 0.
 */
async function backdropAlpha(page: import('@playwright/test').Page): Promise<number> {
	return openDialog(page).evaluate((el) => {
		const colour = getComputedStyle(el, '::backdrop').backgroundColor;
		// "rgba(r, g, b, a)" -> a; "rgb(r, g, b)" is fully opaque; anything
		// else (transparent, none) counts as nothing painted.
		const match = colour.match(/^rgba?\(([^)]+)\)$/);
		if (!match) return 0;
		const parts = match[1].split(',').map((p) => parseFloat(p));
		return parts.length === 4 ? parts[3] : 1;
	});
}

Given('the site is in dark mode', async ({ page }) => {
	// The theme is carried on <body> as a class, set before the dialog opens so
	// the backdrop is resolved in the theme under test.
	await page.emulateMedia({ colorScheme: 'dark' });
	await page.addInitScript(() => {
		document.addEventListener('DOMContentLoaded', () =>
			document.body.classList.add('dark')
		);
	});
});

Then('the page behind the modal is dimmed', async ({ page }) => {
	const alpha = await backdropAlpha(page);
	// Enough to read as a dimmed page rather than a tint. Skeleton's own
	// backdrop token is 0.7; anything below a quarter would not separate the
	// dialog from an app bar of the same surface family.
	expect(alpha, 'the ::backdrop paints nothing behind the modal').toBeGreaterThan(0.25);
});

Then('the modal is brighter than the page behind it', async ({ page }) => {
	const { dialogAlpha, backdrop } = await openDialog(page).evaluate((el) => {
		const own = getComputedStyle(el).backgroundColor;
		const back = getComputedStyle(el, '::backdrop').backgroundColor;
		const alphaOf = (colour: string) => {
			const match = colour.match(/^rgba?\(([^)]+)\)$/);
			if (!match) return 0;
			const parts = match[1].split(',').map((p) => parseFloat(p));
			return parts.length === 4 ? parts[3] : 1;
		};
		return { dialogAlpha: alphaOf(own), backdrop: alphaOf(back) };
	});
	// The dialog paints its own opaque surface, so it is never seen through the
	// dim the way the page behind it is.
	expect(dialogAlpha, 'the dialog has no solid background of its own').toBeGreaterThan(backdrop);
});

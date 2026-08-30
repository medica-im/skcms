import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';

const { Then } = createBdd(test);

// "I am signed in with the role ..." lives in common.steps.ts and "I open the
// home page" in avatar-access.steps.ts — playwright-bdd shares every step
// across the suite, so they are not redefined here.

/**
 * Measured on the *labels*, not on the controls that contain them.
 *
 * The outer boxes can line up perfectly while the text inside them does not:
 * Skeleton's `btn` centres its content as a flex box, but the sign-out slot was
 * additionally marked `lg:inline-block`, and an inline-block lays its children
 * out on a text baseline instead. Both controls measured 44px tall at the same
 * y, and the words still sat 5px apart — so a box-level assertion passes while
 * the bug is plainly visible.
 */
const labels = async (page: import('@playwright/test').Page) =>
	page.evaluate(() => {
		const form = document.querySelector('form.signOutButton');
		if (!form) throw new Error('not signed in: no sign-out form in the app bar');
		const row = form.parentElement!;
		const menuBtn = row.querySelector(':scope > button')!;
		const outDiv = form.querySelector('.btn')!;
		const textOf = (root: Element) =>
			Array.from(root.querySelectorAll('span')).find((s) => s.textContent!.trim().length > 2);
		const top = (e?: Element | null) => (e ? e.getBoundingClientRect().y : null);
		return {
			menuLabel: top(textOf(menuBtn)),
			outLabel: top(textOf(outDiv)),
			menuIcon: top(menuBtn.querySelector('span')),
			outIcon: top(outDiv.querySelector('span'))
		};
	});

Then('the sign out control is level with the user menu', async ({ page }) => {
	const { menuLabel, outLabel } = await labels(page);
	expect(menuLabel, 'the user menu label should be visible').not.toBeNull();
	expect(outLabel, 'the sign out label should be visible').not.toBeNull();
	// One pixel of tolerance for sub-pixel rounding, no more: the regression
	// this guards against was five.
	expect(
		Math.abs(outLabel! - menuLabel!),
		`"Se déconnecter" sits ${(outLabel! - menuLabel!).toFixed(1)}px off the user menu's label`
	).toBeLessThanOrEqual(1);
});

Then('the sign out control is as tall as the user menu', async ({ page }) => {
	// The icons share the row's baseline too — they are what makes the
	// misalignment obvious at a glance, being taller than the text.
	const { menuIcon, outIcon } = await labels(page);
	expect(Math.abs(outIcon! - menuIcon!)).toBeLessThanOrEqual(1);
});

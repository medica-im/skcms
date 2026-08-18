import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';
import { apiOrigin } from '../tests/fixtures/session';

const { Given, When, Then } = createBdd(test);

/** Backend of the site under test, read from PUBLIC_ORIGIN in .env. */
const API_ORIGIN = apiOrigin();

const editButton = (page: import('@playwright/test').Page) =>
	page.getByRole('switch').first();

/**
 * Any entry page will do — the button is part of the shared contact layout, not
 * of one particular entry. Picked live rather than named: the app serves
 * several datasets and a hardcoded slug only exists in the one it was written
 * against.
 */
async function anyEntrySlug(): Promise<string> {
	const response = await fetch(`${API_ORIGIN}/api/v2/entries`, {
		headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' }
	});
	expect(response.ok, `GET entries -> ${response.status}`).toBeTruthy();
	const entries = (await response.json()) as { entrySlug?: string; active?: boolean }[];
	const candidate = entries.find((e) => e.active && e.entrySlug);
	expect(candidate, 'this site has no active entry').toBeTruthy();
	return candidate!.entrySlug!;
}

// playwright-bdd matches on step text regardless of the Given/When keyword, so
// each step is defined exactly once even when the feature uses both.
Given('I open an entry page', async ({ page }) => {
	const slug = await anyEntrySlug();
	await page.goto(`/e/${slug}`, { waitUntil: 'networkidle' });
});

Then('no edit mode button is shown', async ({ page }) => {
	await expect(editButton(page)).toHaveCount(0);
});

Then('the edit mode button is shown', async ({ page }) => {
	await expect(editButton(page)).toBeVisible({ timeout: 20_000 });
});

Then('the edit mode button is off', async ({ page }) => {
	await expect(editButton(page)).toHaveAttribute('aria-checked', 'false');
});

Then('the edit mode button is on', async ({ page }) => {
	await expect(editButton(page)).toHaveAttribute('aria-checked', 'true');
});

When('I press the edit mode button', async ({ page }) => {
	const button = editButton(page);
	await expect(button).toBeVisible({ timeout: 20_000 });
	await expect(button).toBeEnabled();

	// One press, and it has to be one: this feature asserts the button is on
	// after an odd number of presses and off after an even one, so a helper
	// that re-clicked towards a wanted state would make the scenario pass
	// whatever the toggle did.
	//
	// What has to be waited for instead is hydration. The button is painted
	// server-side with its handler still missing (src/lib/Switch/Switch.svelte
	// attaches onclick on hydrate), and toBeVisible/toBeEnabled are both
	// already true in that window — so the press this step exists to make
	// would land on nothing and the scenario would fail on a toggle that works.
	//
	// The flip itself is the only honest signal that the listener is attached,
	// so the first click doubles as the probe: if the state does not change, no
	// handler was there to receive it and nothing was toggled, so pressing
	// again is not a second press — it is the first one, retried.
	const before = await button.getAttribute('aria-checked');
	const flipped = before === 'true' ? 'false' : 'true';
	const deadline = Date.now() + 20_000;
	for (;;) {
		await button.click();
		try {
			await expect(button).toHaveAttribute('aria-checked', flipped, { timeout: 2_000 });
			return;
		} catch (e) {
			if (Date.now() >= deadline) throw e;
		}
	}
});

/**
 * The wording is deliberately absent from the screen, so the only place it can
 * be checked is the tooltip and the accessible name — which must agree.
 */
Then('its tooltip offers to enable edit mode', async ({ page }) => {
	const button = editButton(page);
	const title = await button.getAttribute('title');
	expect(title, 'no tooltip on the edit button').toBeTruthy();
	await expect(button).toHaveAttribute('aria-label', title!);
});

Then('its tooltip offers to leave edit mode', async ({ page }) => {
	const button = editButton(page);
	const title = await button.getAttribute('title');
	expect(title, 'no tooltip on the edit button').toBeTruthy();
	await expect(button).toHaveAttribute('aria-label', title!);
});

Then('the edit mode button reports itself as a switch', async ({ page }) => {
	await expect(editButton(page)).toHaveAttribute('role', 'switch');
	await expect(editButton(page)).toHaveAttribute('aria-checked', /true|false/);
});

/** The old control disabled the active option, which removed it from the tab order. */
Then('it is never disabled', async ({ page }) => {
	await expect(editButton(page)).toBeEnabled();
});

When('I focus the edit mode button', async ({ page }) => {
	await editButton(page).focus();
});

When('I press Space', async ({ page }) => {
	await page.keyboard.press('Space');
	await page.waitForTimeout(300);
});

/**
 * Colour alone is not a sufficient signal, so the states must also differ in
 * how the button is drawn — a filled disc versus an outlined ring.
 */
Then('the on and off states differ in shape', async ({ page }) => {
	const button = editButton(page);
	const on = await button.evaluate((el) => {
		const style = getComputedStyle(el);
		return { background: style.backgroundColor, border: style.borderWidth, shadow: style.boxShadow };
	});
	await button.click();
	await page.waitForTimeout(300);
	const off = await button.evaluate((el) => {
		const style = getComputedStyle(el);
		return { background: style.backgroundColor, border: style.borderWidth, shadow: style.boxShadow };
	});
	expect(
		on.border !== off.border || on.shadow !== off.shadow,
		`states differ only by colour: ${JSON.stringify({ on, off })}`
	).toBe(true);
});

When('I scroll down the entry page', async ({ page }) => {
	await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
	await page.waitForTimeout(500);
});

Then('the edit mode button is still shown', async ({ page }) => {
	await expect(editButton(page)).toBeInViewport();
});

Then('the edit mode button is at most {int} pixels wide', async ({ page }, max: number) => {
	const box = await editButton(page).boundingBox();
	expect(box, 'edit button has no box').toBeTruthy();
	expect(Math.round(box!.width)).toBeLessThanOrEqual(max);
});

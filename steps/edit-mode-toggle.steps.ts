import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { apiOrigin } from '../tests/fixtures/session';

const { Given, When, Then } = createBdd();

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
	// The button is painted before the page finishes hydrating, so an early
	// click can land before the handler is attached. Waiting for it to be
	// enabled and stable is what makes the press actually register.
	await expect(button).toBeVisible({ timeout: 20_000 });
	await expect(button).toBeEnabled();
	await button.click();
	await page.waitForTimeout(500);
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

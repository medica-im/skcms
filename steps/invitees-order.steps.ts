import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';
import { seedInvitee, removeInvitee } from './seed';

const { Given, When, Then, After } = createBdd(test);

const DAY = 24 * 60 * 60 * 1000;

/** Per-scenario state: the two invitations and the names that identify them on the page. */
const ctx: { uids: string[]; newer: string; older: string } = { uids: [], newer: '', older: '' };

After(async () => {
	const uids = ctx.uids;
	ctx.uids = [];
	for (const uid of uids) await removeInvitee(uid);
});

/**
 * Dated relative to now, so both sit at the top of a newest-first list whatever
 * the site already holds, and a day apart so the order is never a tie.
 */
Given('two invitations created a day apart exist', async ({ baseURL }) => {
	const siteDomain = new URL(baseURL).hostname;
	const tag = Math.random().toString(36).slice(2, 8);
	ctx.newer = `Invitation récente ${tag}`;
	ctx.older = `Invitation ancienne ${tag}`;
	const now = Date.now();
	const older = await seedInvitee({ siteDomain, name: ctx.older, createdAt: now - DAY });
	const newer = await seedInvitee({ siteDomain, name: ctx.newer, createdAt: now });
	ctx.uids = [older.uid, newer.uid];
});

/** Where each name first appears in the page's text: its position in the list. */
async function positions(page: import('@playwright/test').Page) {
	await expect(page.getByText(ctx.newer)).toBeVisible();
	await expect(page.getByText(ctx.older)).toBeVisible();
	const text = await page.locator('body').innerText();
	return { newer: text.indexOf(ctx.newer), older: text.indexOf(ctx.older) };
}

Then('the newer invitation is listed before the older one', async ({ page }) => {
	const { newer, older } = await positions(page);
	expect(newer).toBeLessThan(older);
});

// Clicked until the sort icon turns, re-reading it between clicks: the header is
// server-rendered complete, so a click before hydration lands on a button with
// no handler and does nothing (see setSwitch in facilityContext.ts). Re-reading
// rather than clicking blindly, since a second click on a live header would
// flip the order straight back.
When('I sort the invitations by creation date', async ({ page }) => {
	const header = page.getByRole('button', { name: /^Création/ });
	const icon = header.getByTestId('sort-icon');
	await expect(async () => {
		if ((await icon.getAttribute('data-direction')) !== 'asc') await header.click();
		await expect(icon).toHaveAttribute('data-direction', 'asc', { timeout: 1_000 });
	}).toPass({ timeout: 8_000 });
});

// Before the page opens, so the page renders at that width from the start.
Given('I browse on a phone', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
});

// Retried like the header: a choice made before hydration changes the <select>
// but reaches no handler. Re-choosing the value already shown fires no change,
// so each attempt goes through the other value first.
When('I choose to see the oldest invitations first', async ({ page }) => {
	const sort = page.getByLabel('Trier');
	await expect(async () => {
		await sort.selectOption({ label: "Plus récentes d'abord" });
		await sort.selectOption({ label: "Plus anciennes d'abord" });
		const { newer, older } = await positions(page);
		expect(older).toBeLessThan(newer);
	}).toPass({ timeout: 8_000 });
});

Then('the older invitation is listed before the newer one', async ({ page }) => {
	await expect.poll(async () => {
		const { newer, older } = await positions(page);
		return older < newer;
	}).toBe(true);
});

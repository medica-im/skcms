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

// Clicked until aria-sort changes, re-reading it between clicks: the header is
// server-rendered complete, so a click before hydration lands on a button with
// no handler and does nothing (see setSwitch in facilityContext.ts). Re-reading
// rather than clicking blindly, since a second click on a live header would
// flip the order straight back.
When('I sort the invitations by creation date', async ({ page }) => {
	const header = page.getByRole('button', { name: /^Création/ });
	await expect(async () => {
		if ((await header.getAttribute('aria-sort')) !== 'ascending') await header.click();
		await expect(header).toHaveAttribute('aria-sort', 'ascending', { timeout: 1_000 });
	}).toPass({ timeout: 8_000 });
});

Then('the older invitation is listed before the newer one', async ({ page }) => {
	await expect.poll(async () => {
		const { newer, older } = await positions(page);
		return older < newer;
	}).toBe(true);
});

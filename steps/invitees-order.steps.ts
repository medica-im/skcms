import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';
import { seedInvitee, removeInvitee } from './seed';

const { Given, When, Then, After } = createBdd(test);

const DAY = 24 * 60 * 60 * 1000;

/**
 * An invitation's name as shown on screen. Each invitation is rendered twice,
 * as a compact card for narrow screens and a table row for large ones, one of
 * them hidden by CSS -- positions() reads innerText, which skips the hidden one.
 */
const onScreen = (page: import('@playwright/test').Page, name: string) =>
	page.getByText(name).filter({ visible: true });

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
	await expect(onScreen(page, ctx.newer)).toBeVisible();
	await expect(onScreen(page, ctx.older)).toBeVisible();
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

/** The three invitations of the "sort by use" scenario, by the name that identifies each on the page. */
const used = { recent: '', early: '', unused: '' };

Given('two used invitations and one unused invitation exist', async ({ baseURL }) => {
	const siteDomain = new URL(baseURL).hostname;
	const tag = Math.random().toString(36).slice(2, 8);
	used.recent = `Utilisée récemment ${tag}`;
	used.early = `Utilisée il y a longtemps ${tag}`;
	used.unused = `Jamais utilisée ${tag}`;
	const now = Date.now();
	const seeded = await Promise.all([
		seedInvitee({ siteDomain, name: used.recent, redeemedAt: now - 60 * 60 * 1000 }),
		seedInvitee({ siteDomain, name: used.early, redeemedAt: now - 2 * DAY }),
		seedInvitee({ siteDomain, name: used.unused })
	]);
	ctx.uids = seeded.map((s) => s.uid);
});

/** Clicks the "Utilisation" header until its icon shows `direction` (hydration: see above). */
async function sortByUse(page: import('@playwright/test').Page, direction: 'asc' | 'desc') {
	const header = page.getByRole('button', { name: /^Utilisation/ });
	const icon = header.getByTestId('sort-icon');
	await expect(async () => {
		if ((await icon.getAttribute('data-direction')) !== direction) await header.click();
		await expect(icon).toHaveAttribute('data-direction', direction, { timeout: 1_000 });
	}).toPass({ timeout: 8_000 });
}

When('I sort the invitations by use', async ({ page }) => sortByUse(page, 'desc'));
When('I sort the invitations by use again', async ({ page }) => sortByUse(page, 'asc'));

/** The three names' positions in the page's text, i.e. their order in the list. */
async function order(page: import('@playwright/test').Page) {
	for (const name of Object.values(used)) await expect(onScreen(page, name)).toBeVisible();
	const text = await page.locator('body').innerText();
	return {
		recent: text.indexOf(used.recent),
		early: text.indexOf(used.early),
		unused: text.indexOf(used.unused)
	};
}

Then('the most recently used invitation comes first, and the unused one last', async ({ page }) => {
	await expect.poll(async () => {
		const o = await order(page);
		return o.recent < o.early && o.early < o.unused;
	}).toBe(true);
});

Then('the earliest used invitation comes first, and the unused one last', async ({ page }) => {
	await expect.poll(async () => {
		const o = await order(page);
		return o.early < o.recent && o.recent < o.unused;
	}).toBe(true);
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
		await sort.selectOption({ label: "Création — plus récentes d'abord" });
		await sort.selectOption({ label: "Création — plus anciennes d'abord" });
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

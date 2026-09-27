import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test, basePathOf } from './fixtures';
import { cloneEntry, removeClonedEntry, type ClonedEntry } from './seed';

const { Given, When, Then, After } = createBdd(test);

/** Per-scenario state. */
const ctx: { clone?: ClonedEntry } = {};

After(async () => {
	if (!ctx.clone) return;
	const { uid } = ctx.clone;
	ctx.clone = undefined;
	await removeClonedEntry(uid);
});

/**
 * A clone of the entry seed_worker_sites.py plants as `-entry-0`: chosen by
 * the role it was seeded for rather than by where it sorts, and copied so the
 * scenario owns what it reads.
 */
Given('an entry of my own exists on the site', async ({ baseURL }) => {
	const response = await fetch(`${new URL(baseURL).origin}/api/v2/entries`);
	expect(response.ok, `GET /api/v2/entries -> ${response.status}`).toBe(true);
	const entries = (await response.json()) as { uid?: string; entrySlug?: string; active?: boolean }[];
	const source = entries.find((e) => e.active && e.entrySlug?.endsWith('-entry-0'));
	expect(source, 'no -entry-0 on this site: re-run seed_worker_sites.py').toBeTruthy();
	ctx.clone = await cloneEntry({ sourceUid: source!.uid! });
});

When("I open that entry's page", async ({ page }) => {
	await page.goto(`/e/${ctx.clone!.slug}`);
});

Then('its canonical link is its public address, base path included', async ({ page, baseURL }) => {
	const expected = `${new URL(baseURL).origin}${basePathOf(baseURL)}/e/${ctx.clone!.slug}`;
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', expected);
});

Then("the page title starts with the entry's name", async ({ page }) => {
	await expect(page).toHaveTitle(new RegExp(`^${escapeRegExp(ctx.clone!.name)}, `));
});

Then("the page description starts with the entry's name", async ({ page }) => {
	await expect(page.locator('meta[name="description"]')).toHaveAttribute(
		'content',
		new RegExp(`^${escapeRegExp(ctx.clone!.name)}, `)
	);
});

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

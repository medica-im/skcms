import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';
import { apiOrigin } from '../tests/fixtures/session';
import { setSwitch } from './facilityContext';

const { Given, When, Then } = createBdd(test);

/** Backend of the site under test, read from PUBLIC_ORIGIN in .env. */
const API_ORIGIN = apiOrigin();

type TagCategory = {
	uid: string;
	name: string;
	label: string;
	effector_types: string[];
};

type ApiTag = { uid: string; label: string; labelShort: string };

type Entry = {
	uid?: string;
	entrySlug?: string;
	active?: boolean;
	effector_type?: { uid?: string; label?: string };
};

/**
 * The category under test, and an entry it applies to.
 *
 * Discovered from the API in the same run rather than named here. A category is
 * linked to its effector types in the graph, and both sides are reference data:
 * naming "mention IPA" and the slug of some IPA would pin the test to one
 * dataset and to today's contents. What the feature asserts is the link, so the
 * link is what the steps look up.
 */
type Subject = { category: TagCategory; entry: Entry; tags: ApiTag[] };
let subject: Subject | undefined;

async function json<T>(path: string): Promise<T> {
	const response = await fetch(`${API_ORIGIN}${path}`, {
		headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' }
	});
	expect(response.ok, `GET ${path} -> ${response.status}`).toBeTruthy();
	return (await response.json()) as T;
}

Given('the address book has a tag category linked to an effector type', async () => {
	const categories = await json<TagCategory[]>('/api/v2/tag_categories');
	const entries = await json<Entry[]>('/api/v2/entries');

	// The first category that both has tags and has an active entry of a type it
	// covers: a category linked to a profession this site does not employ is
	// real data, not a failure, and the scenario simply has nothing to say
	// about it.
	for (const category of categories) {
		const tags = await json<ApiTag[]>(`/api/v2/tags?category=${category.name}`);
		if (!tags.length) continue;
		const entry = entries.find(
			(e) => e.active && e.entrySlug && e.effector_type?.uid
				&& category.effector_types?.includes(e.effector_type.uid)
		);
		if (entry) {
			subject = { category, entry, tags };
			return;
		}
	}

	expect(
		subject,
		'no tag category on this site has both tags and an active entry of a linked effector type'
	).toBeTruthy();
});

/** The dialog's own selects, so a select elsewhere on the page cannot match. */
const dialogSelect = (page: import('@playwright/test').Page, index: number) =>
	page.locator('dialog[open] .svelte-select').nth(index);

const openTagDialog = async (page: import('@playwright/test').Page) => {
	// Named by what it offers rather than by a test id: the button says "Ajouter
	// une étiquette" on an entry with no tags and "Modifier les étiquettes" on
	// one that has some, and a scenario should not care which it found.
	await page
		.getByRole('button', { name: /étiquette/i })
		.first()
		.click();
	await expect(page.locator('dialog[open]')).toBeVisible({ timeout: 8_000 });
};

const openEntryInEditMode = async (page: import('@playwright/test').Page) => {
	await page.goto(`/e/${subject!.entry.entrySlug}`, { waitUntil: 'networkidle' });
	const toggle = page.getByRole('switch').first();
	await expect(toggle).toBeVisible({ timeout: 8_000 });
	await setSwitch(toggle, true);
};

When('I open an entry whose effector type has tag categories', async ({ page }) => {
	await page.goto(`/e/${subject!.entry.entrySlug}`, { waitUntil: 'networkidle' });
});

// "I turn on edit mode" is defined in user-role-change.steps.ts, which uses
// setSwitch: a single click on the toggle silently does nothing until it has
// hydrated, so the helper re-clicks until the state actually changes.

Then('the tag dialog can be opened', async ({ page }) => {
	await openTagDialog(page);
});

Given('I have opened the tag dialog on an entry of that effector type', async ({ page }) => {
	await openEntryInEditMode(page);
	await openTagDialog(page);
});

When('I choose that tag category', async ({ page }) => {
	const category = dialogSelect(page, 0);
	await category.click();
	const list = page.locator('.svelte-select-list');
	await expect(list).toBeVisible({ timeout: 8_000 });
	// The list is handed to floating-ui after it renders; clicking while it is
	// still `prefloat` hits where the option is about to stop being.
	await expect(page.locator('.svelte-select-list.prefloat')).toHaveCount(0, { timeout: 5_000 });
	await list.locator('.item', { hasText: subject!.category.label }).first().click();
});

/** The options the tag dropdown is offering, as their visible labels. */
async function offeredTags(page: import('@playwright/test').Page): Promise<string[]> {
	// The input rather than the container: this select is `multiple`, and
	// svelte-select only opens its list when the input itself takes focus —
	// clicking the box around it leaves the list rendered but hidden.
	const tagSelect = dialogSelect(page, 1);
	await tagSelect.locator('input').first().click();
	const list = page.locator('.svelte-select-list');
	await expect(list).toBeVisible({ timeout: 8_000 });
	await expect(page.locator('.svelte-select-list.prefloat')).toHaveCount(0, { timeout: 5_000 });
	return (await list.locator('.item').allInnerTexts()).map((t) => t.trim());
}

Then('the tag dropdown offers exactly the tags of that category', async ({ page }) => {
	const offered = await offeredTags(page);
	// Every tag of the category, less the ones this entry already carries:
	// svelte-select drops an option once it is selected, so a tag the entry
	// holds is missing from the list by design rather than by fault.
	const alreadyHeld = await page
		.locator('dialog[open] .svelte-select')
		.nth(1)
		.locator('.multi-item')
		.allInnerTexts();
	const held = new Set(alreadyHeld.map((t) => t.replace(/\s*✕?\s*$/, '').trim()));
	const expected = subject!.tags.map((t) => t.labelShort).filter((l) => !held.has(l));
	expect(offered.slice().sort()).toEqual(expected.slice().sort());
});

Then('every tag offered is one the API returns for that category', async ({ page }) => {
	const offered = await offeredTags(page);
	const known = new Set(subject!.tags.map((t) => t.labelShort));
	expect(offered.length, 'the dropdown offered nothing').toBeGreaterThan(0);
	for (const label of offered) {
		expect(known.has(label), `"${label}" is not a tag of ${subject!.category.name}`).toBe(true);
	}
});

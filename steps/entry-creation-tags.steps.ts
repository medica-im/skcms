import { createBdd } from 'playwright-bdd';
import { test, expect } from './fixtures';
import { djangoShell } from './seed';
import { ctx, pick } from './entry-creation-flow.steps';

const { Given, When, Then } = createBdd(test);

type Page = import('@playwright/test').Page;

type EffectorType = { uid: string; name_fr: string };
type TagCategory = { uid: string; label: string; effector_types: string[] | null };
type ApiTag = { uid: string; label: string; labelShort: string | null; category: string };

/**
 * The occupation under test, its categories that have tags, and the tag a
 * scenario chose. Found from this site's API in the same run.
 */
const tagged: {
	type?: EffectorType;
	categories?: TagCategory[];
	tags?: ApiTag[];
	chosen?: ApiTag;
} = {};

async function json<T>(origin: string, path: string): Promise<T> {
	const response = await fetch(`${origin}${path}`, { headers: { 'Cache-Control': 'no-cache' } });
	expect(response.ok, `GET ${path} -> ${response.status}`).toBeTruthy();
	return (await response.json()) as T;
}

const shown = (tag: ApiTag) => tag.labelShort || tag.label;

/** The tag step's card, so that a select elsewhere on the page cannot match. */
const tagStep = (page: Page) =>
	page.locator('.card', { has: page.getByRole('heading', { name: 'Étiquettes' }) });

Given('this directory offers an occupation that has tag categories', async ({ baseURL }) => {
	const origin = new URL(baseURL!).origin;
	const types = await json<EffectorType[]>(origin, '/api/v2/effector-types?scope=directory');
	const categories = await json<TagCategory[]>(origin, '/api/v2/tag_categories');
	const tags = await json<ApiTag[]>(origin, '/api/v2/tags');
	Object.assign(tagged, { type: undefined, categories: undefined, tags: undefined, chosen: undefined });
	for (const type of types) {
		const linked = categories.filter(
			(c) => c.effector_types?.includes(type.uid) && tags.some((t) => t.category === c.uid)
		);
		if (linked.length) {
			tagged.type = type;
			tagged.categories = linked;
			tagged.tags = tags.filter((t) => linked.some((c) => c.uid === t.category));
			return;
		}
	}
	expect(tagged.type, 'no occupation of this directory has a tag category with tags').toBeTruthy();
});

When('I choose that tagged occupation', async ({ page }) => {
	await pick(page, 'Sélectionner une catégorie', tagged.type!.name_fr);
	await expect(page.getByText('1 catégorie sélectionnée')).toBeVisible();
});

Then('the tags of its categories are offered at once', async ({ page }) => {
	const step = tagStep(page);
	await expect(step).toBeVisible({ timeout: 10_000 });
	for (const category of tagged.categories!) {
		await expect(step.getByText(category.label, { exact: true })).toBeVisible();
	}
	const input = step.locator('.svelte-select input').first();
	const list = page.locator('.svelte-select-list');
	await expect(async () => {
		await input.click();
		await expect(list).toBeVisible({ timeout: 2_000 });
	}).toPass({ timeout: 20_000 });
	await expect(page.locator('.svelte-select-list.prefloat')).toHaveCount(0, { timeout: 5_000 });
	const offered = (await list.locator('.item').allInnerTexts()).map((t) => t.trim());
	const first = tagged.tags!.filter((t) => t.category === tagged.categories![0].uid).map(shown);
	expect(offered.slice().sort()).toEqual(first.slice().sort());
	await page.keyboard.press('Escape');
});

Then('no tag category is asked for', async ({ page }) => {
	await expect(tagStep(page).locator('.svelte-select')).toHaveCount(tagged.categories!.length);
	await expect(page.getByPlaceholder('Sélectionner une catégorie')).toHaveCount(0);
});

Then('the person question waits for the tags', async ({ page }) => {
	await expect(page.getByRole('button', { name: 'Valider les étiquettes' })).toBeDisabled();
	await expect(
		page.getByRole('heading', { name: 'Sélectionner ou créer une personne physique ou morale' })
	).toHaveCount(0);
});

When('I choose one of its tags and confirm the tags', async ({ page }) => {
	const step = tagStep(page);
	await expect(step).toBeVisible({ timeout: 10_000 });
	const input = step.locator('.svelte-select input').first();
	const list = page.locator('.svelte-select-list');
	const candidate = tagged.tags!.find((t) => t.category === tagged.categories![0].uid)!;
	await expect(async () => {
		await input.click();
		await expect(list).toBeVisible({ timeout: 2_000 });
		await expect(page.locator('.svelte-select-list.prefloat')).toHaveCount(0, { timeout: 2_000 });
		await list.locator('.item', { hasText: shown(candidate) }).first().click();
		await expect(step.locator('.multi-item', { hasText: shown(candidate) })).toBeVisible({
			timeout: 2_000
		});
	}).toPass({ timeout: 20_000 });
	tagged.chosen = candidate;
	await page.getByRole('button', { name: 'Valider les étiquettes' }).click();
	await expect(step.getByText(shown(candidate), { exact: true })).toBeVisible();
});

When('I skip the tags', async ({ page }) => {
	await expect(tagStep(page)).toBeVisible({ timeout: 10_000 });
	await tagStep(page).getByRole('button', { name: 'Passer' }).click();
	await expect(tagStep(page).getByText('Aucune étiquette')).toBeVisible();
});

async function tagsOfNewEntry(): Promise<string[]> {
	const out = await djangoShell(
		`from neomodel import db\n` +
			`rows, _ = db.cypher_query("MATCH (t:Tag)-[:TAGS]->(e:Entry {slug: $slug}) RETURN t.uid", {"slug": ${JSON.stringify(ctx.entrySlug)}})\n` +
			`print("tags", sorted(r[0] for r in rows))`,
		{ readOnly: true }
	);
	return JSON.parse((out.split('tags')[1] ?? '[]').trim().replace(/'/g, '"'));
}

Then('the new entry carries the tag chosen', async () => {
	expect(await tagsOfNewEntry()).toEqual([tagged.chosen!.uid]);
});

Then('the new entry carries no tag', async () => {
	expect(await tagsOfNewEntry()).toEqual([]);
});

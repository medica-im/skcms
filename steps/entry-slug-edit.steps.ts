import { createBdd } from 'playwright-bdd';
import { test, expect } from './fixtures';
import { ctx, entryAs } from './entry-effector-type-edit.steps';

const { Given, When, Then } = createBdd(test);

type Page = import('@playwright/test').Page;

// The person, the facility and the entries are made and removed by the creation-flow
// and type-edit steps (the feature carries their tags); "I open that entry in edit
// mode", "the entry has a new address" and "its former address leads to it" are
// theirs too. Here, an entry owned by the staff member, and the address dialog.

const other: { slug?: string } = {};

const pen = (page: Page) => page.getByTestId('entry-slug-edit');
const dialog = (page: Page) => page.getByTestId('entry-slug-dialog');
const field = (page: Page) => dialog(page).getByRole('textbox');

async function openDialog(page: Page) {
	await expect(async () => {
		await pen(page).click();
		await expect(dialog(page)).toBeVisible({ timeout: 2_000 });
	}).toPass({ timeout: 20_000 });
}

Given('an entry for them as {string}, owned by that staff member', async ({ baseURL }, typeName: string) => {
	const origin = new URL(baseURL).origin;
	const entry = await entryAs(origin, typeName, true);
	ctx.entryUid = entry.uid;
	ctx.slug = entry.entrySlug ?? entry.slug;
	ctx.host = new URL(baseURL).hostname;
	expect(ctx.slug, `the new entry has no slug: ${JSON.stringify(entry)}`).toBeTruthy();
});

Given('another entry for them as {string}, whose address I note', async ({ baseURL }, typeName: string) => {
	const entry = await entryAs(new URL(baseURL).origin, typeName);
	other.slug = entry.entrySlug ?? entry.slug;
	expect(other.slug, `the other entry has no slug: ${JSON.stringify(entry)}`).toBeTruthy();
});

When('I change its address', async ({ page }) => {
	ctx.formerSlug = ctx.slug;
	const wanted = `${ctx.slug}-corrige`;
	await openDialog(page);
	await field(page).fill(wanted);
	await expect(dialog(page).getByTestId('slug-status')).toHaveAttribute('data-status', 'free', { timeout: 10_000 });
	await dialog(page).getByTestId('entry-slug-save').click();
	await expect(page).toHaveURL(new RegExp(`/e/${wanted}$`), { timeout: 15_000 });
	ctx.slug = wanted;
});

When('I try the address of the other entry', async ({ page }) => {
	await openDialog(page);
	await field(page).fill(other.slug!);
});

Then("the page shows the entry's own address", async ({ page }) => {
	await expect(page.getByTestId('entry-slug')).toHaveText(`/e/${ctx.slug}`);
});

Then('the address cannot be changed', async ({ page }) => {
	await expect(page.getByTestId('entry-slug')).toHaveCount(0);
	await expect(pen(page)).toHaveCount(0);
});

Then('the address can be changed', async ({ page }) => {
	await expect(pen(page)).toBeVisible();
});

Then('I am told the address is already used by another entry', async ({ page }) => {
	const status = dialog(page).getByTestId('slug-status');
	await expect(status).toHaveAttribute('data-status', 'taken', { timeout: 10_000 });
	await expect(status).toContainText('déjà utilisée par une autre fiche');
});

Then('I am offered free addresses for this entry', async ({ page }) => {
	await expect(dialog(page).getByTestId('slug-suggestions').getByRole('button').first()).toBeVisible();
});

Then('the address cannot be saved', async ({ page }) => {
	await expect(dialog(page).getByTestId('entry-slug-save')).toBeDisabled();
});

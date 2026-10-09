import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';
import { removeInvitee, seedInvitee } from './seed';

const { Given, When, Then, After } = createBdd(test);

type Page = import('@playwright/test').Page;

const seeded: { uid?: string; email?: string } = {};

After(async () => {
	if (seeded.uid) await removeInvitee(seeded.uid);
	seeded.uid = seeded.email = undefined;
});

const addressField = (page: Page) => page.getByPlaceholder('utilisateur@example.com');
const createButton = (page: Page) => page.getByRole('button', { name: "Créer l'invitation" });
const refusal = (page: Page) => page.getByText(`Une invitation adressée à ${seeded.email} existe déjà.`);

// Filled until the field holds it: before hydration the value is lost.
async function typeAddress(page: Page, address: string) {
	await expect(async () => {
		await addressField(page).fill(address);
		await expect(addressField(page)).toHaveValue(address, { timeout: 2_000 });
	}).toPass({ timeout: 20_000 });
}

Given('an invitation already exists for an address', async ({ baseURL }) => {
	Object.assign(seeded, await seedInvitee({
		siteDomain: new URL(baseURL!).hostname,
		name: `Déjà invité ${Date.now()}`,
	}));
});

When('I invite that address as staff', async ({ page }) => {
	// The role first: its list only opens once the page has hydrated, and an
	// address typed before that is wiped by hydration.
	const list = page.locator('.svelte-select-list');
	await expect(async () => {
		// svelte-select opens its list when its own input takes focus, not the box.
		await page.getByPlaceholder('Sélectionner un rôle').click();
		await expect(list).toBeVisible({ timeout: 2_000 });
	}).toPass({ timeout: 20_000 });
	// The list is handed to floating-ui after it renders; clicking while it is
	// still `prefloat` hits where the option is about to stop being.
	await expect(page.locator('.svelte-select-list.prefloat')).toHaveCount(0, { timeout: 5_000 });
	await list.locator('.item').first().click();
	await typeAddress(page, seeded.email!);
	await createButton(page).click();
});

Then('I read that an invitation to it already exists', async ({ page }) => {
	await expect(refusal(page).first()).toBeVisible({ timeout: 15_000 });
});

Then('the invitation cannot be created', async ({ page }) => {
	await expect(createButton(page)).toBeDisabled();
});

Then('the invitation can be created', async ({ page }) => {
	await expect(createButton(page)).toBeEnabled();
});

When('I type that same address in capitals', async ({ page }) => {
	await typeAddress(page, seeded.email!.toUpperCase());
});

When('I type another address', async ({ page }) => {
	await typeAddress(page, `other-${seeded.email}`);
});

Then('the refusal is no longer shown', async ({ page }) => {
	await expect(refusal(page)).toHaveCount(0);
});

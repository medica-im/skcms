import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';
import { seedInvitee, removeInvitee } from './seed';

const { Given, When, Then, After } = createBdd(test);

type Page = import('@playwright/test').Page;

/** The three invitations, by the name that identifies each on the page. */
const names = { active: '', used: '', disabled: '' };
let uids: string[] = [];

After(async () => {
	const seeded = uids;
	uids = [];
	for (const uid of seeded) await removeInvitee(uid);
});

Given('an active, a used and a deactivated invitation exist', async ({ baseURL }) => {
	const siteDomain = new URL(baseURL).hostname;
	const tag = Math.random().toString(36).slice(2, 8);
	names.active = `Filtre active ${tag}`;
	names.used = `Filtre utilisée ${tag}`;
	names.disabled = `Filtre désactivée ${tag}`;
	const seeded = await Promise.all([
		seedInvitee({ siteDomain, name: names.active }),
		seedInvitee({ siteDomain, name: names.used, redeemedAt: Date.now() - 60 * 60 * 1000 }),
		seedInvitee({ siteDomain, name: names.disabled, active: false })
	]);
	uids = seeded.map((s) => s.uid);
});

const listed = (page: Page, name: string) => page.getByText(name, { exact: true });

Then('the active, used and deactivated invitations are all listed', async ({ page }) => {
	for (const name of Object.values(names)) await expect(listed(page, name)).toBeVisible();
});

// Pressed until aria-pressed says so: a click before hydration reaches no
// handler (see setSwitch in facilityContext.ts).
When('I show only the {string} invitations', async ({ page }, label: string) => {
	const button = page
		.getByRole('group', { name: 'Filtrer par statut' })
		.getByRole('button', { name: new RegExp(`^${label}`) });
	await expect(async () => {
		if ((await button.getAttribute('aria-pressed')) !== 'true') await button.click();
		await expect(button).toHaveAttribute('aria-pressed', 'true', { timeout: 1_000 });
	}).toPass({ timeout: 8_000 });
});

async function onlyListed(page: Page, kept: keyof typeof names) {
	await expect(listed(page, names[kept])).toBeVisible();
	for (const [key, name] of Object.entries(names)) {
		if (key !== kept) await expect(listed(page, name)).toHaveCount(0);
	}
}

Then('only the used invitation is listed', async ({ page }) => onlyListed(page, 'used'));
Then('only the deactivated invitation is listed', async ({ page }) => onlyListed(page, 'disabled'));

Then('the address asks for {string}', async ({ page }, query: string) => {
	await expect(page).toHaveURL(new RegExp(`[?&]${query}(&|$)`));
});

import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { buttonLabel, tooltipLabel } from '../src/lib/Organization/occupationLabel.js';
import { seedEffectorType, removeSeededData } from './seed';

const { Given, Then, After } = createBdd();

/** The occupation buttons rendered by Occupations.svelte. */
const occupationButtons = (page: import('@playwright/test').Page) =>
	page.locator('a.btn[title]');

Given('the home page team section is displayed', async ({ page }) => {
	await page.goto('/', { waitUntil: 'networkidle' });
	await expect(occupationButtons(page).first()).toBeVisible({ timeout: 20_000 });
});

/** The site this checkout is configured against (see PUBLIC_ORIGIN in .env). */
const SITE_DOMAIN = process.env.SEED_SITE_DOMAIN ?? 'dev.sante-gadagne.fr';

let seeded = false;

Given(
	'the site has an effector type named {string} labelled {string}',
	async ({}, name: string, label: string) => {
		await seedEffectorType({
			siteDomain: SITE_DOMAIN,
			name,
			label,
			slug: `e2e-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
		});
		seeded = true;
	}
);

After(async () => {
	if (!seeded) return;
	seeded = false;
	await removeSeededData();
});

Then('the occupation button shows {string}', async ({ page }, expected: string) => {
	await expect(
		occupationButtons(page).filter({ hasText: expected }).first(),
		`no occupation button showing "${expected}"`
	).toBeVisible({ timeout: 15_000 });
});

/**
 * Located by the tooltip itself, not by its text: the whole point is that the
 * button shows the abbreviation while the title carries the full name, so
 * filtering on the expected text would match nothing.
 */
Then("the button's tooltip shows {string}", async ({ page }, expected: string) => {
	await expect(
		page.locator(`a.btn[title="${expected}"]`).first(),
		`no occupation button whose tooltip is "${expected}"`
	).toBeVisible({ timeout: 15_000 });
});

/** The flexed label is shown in full when there is no acronym to substitute. */
Then(
	'no occupation button shows an abbreviation for {string}',
	async ({ page }, name: string) => {
		const button = occupationButtons(page).filter({ hasText: name }).first();
		await expect(button, `no occupation button for "${name}"`).toBeVisible({ timeout: 15_000 });
		await expect(button).toHaveAttribute('title', name);
	}
);

/**
 * The rule is a pure function, so it is exercised directly rather than through
 * the rendered page: the interesting cases (acronym in the name, feminine
 * plural, capitalised long form) depend on effector type data that does not all
 * exist in the local directory, and seeding it per case would test the fixture
 * more than the rule.
 *
 * Rendering is covered by the team page scenarios; this covers the choice.
 */
let type: { name: string; rawLabel: string; flexed: string };

Given(
	'an effector type named {string} labelled {string}',
	async ({}, name: string, rawLabel: string) => {
		type = { name, rawLabel, flexed: name };
	}
);

Given('the flexed label for the group is {string}', async ({}, flexed: string) => {
	type.flexed = flexed;
});

Then('the button shows {string}', async ({}, expected: string) => {
	expect(buttonLabel(type.flexed, type.name, type.rawLabel)).toBe(expected);
});

Then('its tooltip shows {string}', async ({}, expected: string) => {
	expect(tooltipLabel(type.flexed, type.name, type.rawLabel)).toBe(expected);
});

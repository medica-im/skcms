import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { buttonLabel, tooltipLabel } from '../src/lib/Organization/occupationLabel.js';

const { Given, Then } = createBdd();

/** The occupation buttons rendered by Occupations.svelte. */
const occupationButtons = (page: import('@playwright/test').Page) =>
	page.locator('a.btn[title]');

Given('the home page team section is displayed', async ({ page }) => {
	await page.goto('/', { waitUntil: 'networkidle' });
	await expect(occupationButtons(page).first()).toBeVisible({ timeout: 20_000 });
});

Then('an occupation button shows {string}', async ({ page }, expected: string) => {
	await expect(
		occupationButtons(page).filter({ hasText: expected }).first(),
		`no occupation button showing "${expected}"`
	).toBeVisible();
});

Then("that button's tooltip is {string}", async ({ page }, expected: string) => {
	const button = occupationButtons(page).filter({ hasText: 'CPTS' }).first();
	await expect(button).toHaveAttribute('title', expected);
});

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

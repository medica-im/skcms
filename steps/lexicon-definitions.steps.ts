import { createBdd } from 'playwright-bdd';
import { expect, type Locator } from '@playwright/test';
import { test } from './fixtures';
import dict, { resolve } from '../src/lib/components/TooltipDefinition/lexicon';

const { Given, When, Then } = createBdd(test);

/**
 * The "?" that explains a term in the prose.
 *
 * The expected text is read from the lexicon itself rather than written out
 * here. Copying a definition into a step would pin the scenario to today's
 * wording, so editing the lexicon — the ordinary reason anyone touches it —
 * would fail a test about the lookup. What is asserted is the *relationship*:
 * the popup for a synonym shows the definition stored under the term it points
 * at, whatever that definition happens to say.
 */

const FIXTURE = '/_test/lexicon-terms';

/**
 * The trigger for a term, found by its accessible name.
 *
 * Located the way a screen reader would: the button's name is "<term>, voir la
 * définition", so a plain name match also asserts that the control announces
 * itself as more than the word in the prose beside it.
 */
const trigger = (page: any, term: string, nth = 0) =>
	page.getByRole('button', { name: new RegExp(`^${escapeRe(term)},`) }).nth(nth);

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The popup a trigger controls, via aria-controls.
 *
 * The same attribute a screen reader follows to reach the definition, so a
 * broken association fails here rather than passing on a lucky DOM order.
 */
const popupFor = async (page: any, button: Locator) => {
	const id = await button.getAttribute('aria-controls');
	expect(id, 'the trigger should name the popup it controls').toBeTruthy();
	return page.locator(`#${id}`);
};

Given('I am on the lexicon fixture page', async ({ page }) => {
	const response = await page.goto(FIXTURE, { waitUntil: 'domcontentloaded' });
	// The fixture is dev-only, so a 404 here means the suite is pointed at a
	// build where it does not exist — worth saying plainly rather than failing
	// later on a missing button.
	expect(response?.status(), `${FIXTURE} should be served in dev`).toBeLessThan(400);
});

When('I open the definition of {string}', async ({ page }, term: string) => {
	await trigger(page, term).click();
});

When('I open the second definition of {string}', async ({ page }, term: string) => {
	await trigger(page, term, 1).click();
});

When('I follow the {string} link', async ({ page }, label: string) => {
	await page.getByRole('link', { name: new RegExp(label, 'i') }).first().click();
});

Then(
	'the definition shown is the one written for {string}',
	async ({ page }, term: string) => {
		const entry = resolve(term);
		expect(entry, `${term} should be in the lexicon`).toBeDefined();
		// The first paragraph only: the popup is a reminder, and the rest lives
		// on the lexique page.
		await expect(page.getByText(entry!.definition[0], { exact: false })).toBeVisible();
	}
);

Then(
	'the popup names both the abbreviation and what it stands for',
	async ({ page }) => {
		// The reader met "MSP" and is owed the words behind it, so both appear.
		await expect(page.getByRole('abbreviation').or(page.locator('abbr')).first()).toBeVisible();
		await expect(page.locator('dfn').first()).toContainText('Maison de santé pluriprofessionnelle');
	}
);

Then('I am on the lexique page', async ({ page }) => {
	await expect(page).toHaveURL(/\/maison-de-sante\/lexique/);
});

Then('the entry for {string} is scrolled to', async ({ page }, term: string) => {
	// The anchor and the lexique page's own ids are built by the same helper,
	// so a mismatch is the failure this asserts: the href names an id that is
	// really on the page, and the browser reached it.
	const hash = new URL(page.url()).hash;
	expect(hash, 'the link should carry a fragment').not.toBe('');
	const target = page.locator(hash);
	await expect(target).toBeVisible();
	await expect(target).toHaveText(term);
});

Then('the term {string} is still shown in the prose', async ({ page }, term: string) => {
	expect(term in dict, `${term} should not be in the lexicon`).toBe(false);
	await expect(page.getByText(term, { exact: false }).first()).toBeVisible();
});

Then('opening it offers no definition', async ({ page }) => {
	await trigger(page, 'INCONNU').click();
	// Nothing to show, so nothing opens — and in particular no "en savoir plus"
	// pointing at an entry the lexique page does not have.
	await expect(page.locator('[data-popup] dfn')).toHaveCount(0);
});

Then('exactly one definition is open', async ({ page }) => {
	const open = page.locator('[data-popup] dfn').filter({ visible: true });
	await expect(open).toHaveCount(1);
});

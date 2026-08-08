import { test, expect } from '@playwright/test';
import { addSessionCookie } from '../steps/common.steps';

/**
 * What a select actually says, in the browser, in French.
 *
 * The catalogue tests in src/lib/i18n-messages.test.ts compare fr.json against
 * en.json, and the source test in src/lib/Web/select-wrapper.test.ts checks
 * that the wrapper overrides svelte-select's English defaults. Neither could
 * have caught the bug this exists for: "Please select" was never *in* a
 * catalogue to be compared. It was a library default, shown in three dozen
 * French modals because most call sites pass no placeholder of their own.
 *
 * Only reading the rendered page finds text that no message file knows about.
 */

const ENTRY = 'e2e-w0-entry-0';

/** Text svelte-select falls back to when the wrapper stops overriding it. */
const ENGLISH_DEFAULTS = [
	'Please select',
	'No options',
	'You are currently focused on option',
	'Select is focused, type to refine list',
	', selected.'
];

test('a French select says nothing in English', async ({ context, page, baseURL }) => {
	test.setTimeout(120_000);
	await addSessionCookie(context, 'superuser', baseURL);
	await page.goto(`/e/${ENTRY}`, { waitUntil: 'networkidle' });

	const pencil = page.getByRole('switch').first();
	await expect(pencil).toBeVisible({ timeout: 20_000 });
	await pencil.click();

	// The phone modal carries two selects, one of which has no placeholder of
	// its own — the case that showed the library default.
	const heading = page.locator('h4', { hasText: /^Téléphone/ }).first();
	await expect(heading).toBeVisible({ timeout: 15_000 });
	await heading.locator('button[title="Ajouter"]').first().click();
	const dialog = page.locator('dialog[open]').first();
	await expect(dialog).toBeVisible({ timeout: 10_000 });

	const selects = dialog.locator('.svelte-select');
	const count = await selects.count();
	expect(count, 'no select in the phone modal').toBeGreaterThan(0);

	// Placeholders, before anything is opened.
	const placeholders = await dialog
		.locator('.svelte-select input')
		.evaluateAll((els) => els.map((e) => (e as HTMLInputElement).placeholder).filter(Boolean));
	expect(placeholders.length, 'no placeholder rendered at all').toBeGreaterThan(0);
	for (const p of placeholders) {
		expect(
			ENGLISH_DEFAULTS.some((e) => p.includes(e)),
			`a select still shows svelte-select's English placeholder: "${p}"`
		).toBe(false);
	}

	// Open one, so the aria live region is populated. It is announced aloud to
	// screen-reader users and is invisible to everyone else, which is exactly
	// why it stayed English long after the visible text was translated.
	await selects.first().click();
	await expect(page.locator('.svelte-select-list')).toBeVisible({ timeout: 5000 });

	const announced = await dialog
		.locator('[aria-live]')
		.evaluateAll((els) => els.map((e) => e.textContent?.trim() ?? '').filter(Boolean));

	for (const line of announced) {
		for (const english of ENGLISH_DEFAULTS) {
			expect(
				line.includes(english),
				`the select announces English to screen readers: "${line}"`
			).toBe(false);
		}
	}
	// Proves the region was actually populated, so an empty one cannot pass this
	// by saying nothing at all.
	expect(announced.join(' ').length, 'nothing was announced, so nothing was checked').toBeGreaterThan(0);
});

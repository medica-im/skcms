import { createBdd } from 'playwright-bdd';
import { test, expect } from './fixtures';
import { djangoShell } from './seed';
import { asStaff } from './entry-creation-flow.steps';
import { ctx as entry } from './entry-effector-type-edit.steps';

const { Given, When, Then, After } = createBdd(test);

// The entry, its person and its facility are made and removed by the
// creation-flow and type-edit steps, which this feature's tags pull in. A
// schedule hangs off the entry and would be left behind when the entry is
// removed, so every schedule of a scenario carries a label that names it.

const label = () => `e2e ${entry.entryUid}`;

After({ tags: '@entry-schedule' }, async () => {
	if (!entry.entryUid) return;
	await djangoShell(
		`from neomodel import db\ndb.cypher_query("MATCH (s:Schedule {label: $label}) DETACH DELETE s", {"label": ${JSON.stringify(label())}})`,
		{ readOnly: true }
	);
});

type Period = { opens: string; closes: string };

const periods = (text: string): Period[] =>
	text.split(',').map((range) => {
		const [opens, closes] = range.split('-');
		return { opens, closes };
	});

async function seedWeekdayHours(origin: string, text: string, holidays: 'closed' | 'open') {
	const days = Object.fromEntries([1, 2, 3, 4, 5].map((day) => [day, periods(text)]));
	await asStaff(origin, '/api/v2/schedules', {
		entry: entry.entryUid,
		channel: 'phone',
		label: label(),
		holidays,
		days
	});
}

Given('that entry has weekday hours {string}, closed on public holidays', async ({ baseURL }, text: string) => {
	await seedWeekdayHours(new URL(baseURL).origin, text, 'closed');
});

Given('that entry has weekday hours {string}, open on public holidays', async ({ baseURL }, text: string) => {
	await seedWeekdayHours(new URL(baseURL).origin, text, 'open');
});

When('I look at that entry', async ({ page }) => {
	await page.goto(`/e/${entry.slug}`, { waitUntil: 'networkidle' });
});

When('I add weekday hours from {string} to {string}', async ({ page }, opens: string, closes: string) => {
	await addWeekdayHours(page, opens, closes);
});

When(
	'I add weekday hours from {string} to {string}, open on public holidays',
	async ({ page }, opens: string, closes: string) => {
		await addWeekdayHours(page, opens, closes, 'Ouvert');
	}
);

async function addWeekdayHours(
	page: import('@playwright/test').Page,
	opens: string,
	closes: string,
	holidays?: 'Ouvert'
) {
	await expect(async () => {
		await page.getByTitle('Ajouter des horaires').click();
		await expect(page.getByTestId('schedule-editor')).toBeVisible({ timeout: 2_000 });
	}).toPass({ timeout: 20_000 });
	const editor = page.getByTestId('schedule-editor');
	await editor.getByLabel('Intitulé (facultatif)').fill(label());
	await editor.getByRole('button', { name: 'Lun–Ven' }).click();
	await editor.getByRole('button', { name: 'Ajouter une plage' }).click();
	await editor.getByLabel('De', { exact: true }).fill(opens);
	await editor.getByLabel('à', { exact: true }).fill(closes);
	if (holidays) await editor.getByRole('radiogroup', { name: 'Jours fériés' }).getByText(holidays).click();
	await editor.getByRole('button', { name: 'Enregistrer' }).click();
	await expect(page.getByTestId('schedule-editor')).toBeHidden({ timeout: 15_000 });
}

When('I delete its hours', async ({ page }) => {
	await expect(async () => {
		await page.getByTitle('Modifier les horaires').first().click();
		await expect(page.getByTestId('schedule-editor')).toBeVisible({ timeout: 2_000 });
	}).toPass({ timeout: 20_000 });
	const editor = page.getByTestId('schedule-editor');
	await editor.getByRole('button', { name: 'Supprimer', exact: true }).click();
	await editor.getByRole('button', { name: 'Confirmer la suppression' }).click();
	await expect(editor).toBeHidden({ timeout: 15_000 });
});

const cards = (page: import('@playwright/test').Page) => page.getByTestId('schedule-card');

Then('its hours read {string}', async ({ page }, text: string) => {
	await expect(cards(page).first()).toContainText(text, { timeout: 15_000 });
});

Then('its hours do not mention {string}', async ({ page }, text: string) => {
	await expect(cards(page).first()).toBeVisible();
	await expect(cards(page).first()).not.toContainText(text);
});

Then('its hours say {string}', async ({ page }, text: string) => {
	await expect(cards(page).first()).toContainText(text, { timeout: 15_000 });
});

Then('the entry shows no hours', async ({ page }) => {
	await expect(cards(page)).toHaveCount(0, { timeout: 15_000 });
});

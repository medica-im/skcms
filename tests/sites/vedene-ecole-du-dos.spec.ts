import { test, expect, type Page } from '@playwright/test';
import { originFor, requireSite } from './sites';

/**
 * The école du dos calendar: the 2025 session's ten workshops.
 */

const SITE = 'msp-vedene.fr';
const ORIGIN = originFor(SITE);

test.beforeAll(async () => await requireSite(SITE));

async function openCalendar(page: Page) {
	await page.setViewportSize({ width: 1280, height: 900 });
	await page.goto(`${ORIGIN}/education-therapeutique/ecole-du-dos`);
	await page.locator('.fc').first().waitFor({ timeout: 20_000 });
}

test('the calendar lists all ten workshops at once', async ({ page }) => {
	await openCalendar(page);
	const calendar = page.locator('.fc').first();
	for (let n = 1; n <= 10; n++) {
		await expect(calendar.getByText(`Atelier n°${n}`, { exact: true })).toBeVisible();
	}
});

test('the list cannot leave the session', async ({ page }) => {
	await openCalendar(page);
	await expect(page.locator('.fc-prev-button').first()).toBeDisabled();
	await expect(page.locator('.fc-next-button').first()).toBeDisabled();
});

test('the month view opens on the first month of the session', async ({ page }) => {
	await openCalendar(page);
	await page.locator('.fc-dayGridMonth-button').first().click();
	await expect(page.locator('.fc-toolbar-title').first()).toHaveText(/avril 2025/i);
	await expect(page.locator('.fc').first().getByText('Atelier n°1')).toBeVisible();
});

test('the venue link opens the page of the Pôle santé Vedène', async ({ page }) => {
	await page.goto(`${ORIGIN}/education-therapeutique/ecole-du-dos`);
	await page.getByRole('link', { name: 'pôle médico-social Jean Jaurès' }).click();
	await expect(page).toHaveURL(`${ORIGIN}/sites/pole-sante-vedene`);
	await expect(page.getByRole('heading', { name: 'Pôle santé Vedène' }).first()).toBeVisible();
});

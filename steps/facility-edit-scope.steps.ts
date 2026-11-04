import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';

const { When, Then } = createBdd(test);

// Opening the dialog and choosing the screen are in
// facility-modal-mobile.steps.ts.

const dialog = (page: import('@playwright/test').Page) => page.locator('dialog[open]');
const field = (page: import('@playwright/test').Page, label: string) =>
	dialog(page).locator('label', { hasText: label }).locator('input');

Then('the postal code is shown and cannot be edited', async ({ page }) => {
	const zip = field(page, 'Code postal');
	await expect(zip).toHaveValue(/^\d{5}$/);
	await expect(zip).not.toBeEditable();
	// Not disabled: a disabled input is left out of the submitted form, and the
	// postal code has to travel with the rest of the facility.
	await expect(zip).toBeEnabled();
});

Then('the commune cannot be edited', async ({ page }) => {
	await expect(field(page, 'Commune')).not.toBeEditable();
});

const geocoder = (page: import('@playwright/test').Page) =>
	dialog(page).locator('input[name="geocoder"]');

// The address service is a public one we don't run: a stub keeps the scenario
// about what the dialog does with an answer, not about the service's uptime.
let offeredPostcode = '';

When(
	'I search an address of another postal code of the same commune in the geocoder',
	async ({ page }) => {
		const zip = await field(page, 'Code postal').inputValue();
		const commune = await field(page, 'Commune').inputValue();
		const last = Number(zip.slice(-1));
		offeredPostcode = zip.slice(0, -1) + String((last + 1) % 10);
		await page.route('https://api-adresse.data.gouv.fr/search/**', (route) =>
			route.fulfill({
				json: {
					type: 'FeatureCollection',
					features: [
						{
							type: 'Feature',
							geometry: { type: 'Point', coordinates: [4.83, 45.77] },
							properties: {
								id: 'stub_1',
								banId: '00000000-0000-0000-0000-000000000001',
								name: '1 Rue du Correctif',
								housenumber: '1',
								street: 'Rue du Correctif',
								postcode: offeredPostcode,
								city: commune
							}
						}
					]
				}
			})
		);
		await geocoder(page).fill('1 rue du Correctif');
	}
);

Then('that address is offered', async ({ page }) => {
	await expect(dialog(page).getByRole('button', { name: /Rue du Correctif/ })).toBeVisible();
});

When('I choose the address offered', async ({ page }) => {
	await dialog(page).getByRole('button', { name: /Rue du Correctif/ }).click();
});

Then('the postal code is that of the address chosen', async ({ page }) => {
	await expect(field(page, 'Code postal')).toHaveValue(offeredPostcode);
});

When('I click in the geocoder', async ({ page }) => {
	await geocoder(page).click();
});

Then('the geocoder warning is not shown', async ({ page }) => {
	await expect(dialog(page).getByTestId('geocoder-notice')).toHaveCount(0);
});

Then(
	'the geocoder warning says it corrects an error, does not create a new établissement, and sends a moved entry to an administrator',
	async ({ page }) => {
		const notice = dialog(page).getByTestId('geocoder-notice');
		await expect(notice).toBeVisible();
		await expect(notice).toContainText('corriger une erreur');
		await expect(notice).toContainText('nouvel établissement');
		await expect(notice).toContainText('contacter un administrateur');
	}
);

Then('zoom, latitude and longitude are on the same line', async ({ page }) => {
	const tops = await Promise.all(
		['zoom', 'latitude', 'longitude'].map(async (name) => {
			const box = await dialog(page).locator(`input[name="${name}"]`).boundingBox();
			expect(box, `no ${name} field`).toBeTruthy();
			return Math.round(box!.y);
		})
	);
	expect(new Set(tops).size, `fields are at ${tops.join(', ')}px`).toBe(1);
});

Then('the postal code and the commune are on the same line', async ({ page }) => {
	const tops = await Promise.all(
		['Code postal', 'Commune'].map(async (label) => {
			const box = await field(page, label).boundingBox();
			expect(box, `no ${label} field`).toBeTruthy();
			return Math.round(box!.y);
		})
	);
	expect(new Set(tops).size, `fields are at ${tops.join(', ')}px`).toBe(1);
});

Then('the submit button is entirely visible', async ({ page }) => {
	await expect(dialog(page).getByRole('button', { name: 'Envoyer' })).toBeInViewport({ ratio: 1 });
});

Then('the cancel button is entirely visible', async ({ page }) => {
	await expect(dialog(page).getByRole('button', { name: /Annuler|Fermer/ })).toBeInViewport({
		ratio: 1
	});
});

import { createBdd } from 'playwright-bdd';
import { test, expect } from './fixtures';
import { djangoShell } from './seed';
import { ctx as creation, asStaff, pick } from './entry-creation-flow.steps';

const { Given, When, Then } = createBdd(test);

// The creation steps ("I open the creation page with that facility and that
// person", "I choose an occupation", "I confirm the creation") are in
// entry-creation-flow.steps.ts; the feature carries its tag so the person and
// the facility are removed afterwards.

const slugInput = (page: import('@playwright/test').Page) =>
	page.getByTestId('facility-slug-step').locator('input[name="slug"]');

let proposed: string | undefined;

// With a place and a person chosen and no affiliations step (staff), the
// occupation is the last answer: the page goes on to the confirmation form and
// "1 catégorie sélectionnée" is never shown.
When('I choose an occupation and the confirmation form appears', async ({ page }) => {
	await pick(page, 'Sélectionner une catégorie', 'infirmi');
	await expect(page.getByRole('button', { name: 'Valider' })).toBeVisible({ timeout: 15_000 });
});

Given(
	'a person and a facility without an address created by a staff member of this site',
	async ({ baseURL }) => {
		const origin = new URL(baseURL).origin;
		const tag = Date.now().toString(36);
		const facilities = (await (await fetch(`${origin}/api/v2/public/facilities`)).json()) as {
			commune?: string;
		}[];
		const commune = facilities.find((f) => f.commune)?.commune;
		expect(commune, 'no commune found on this site').toBeTruthy();
		const facility = await asStaff(origin, '/api/v2/facilities', {
			name: '',
			label: '',
			building: null,
			street: '1 rue de test',
			geographical_complement: null,
			zip: '84470',
			ban_id: null,
			ban_banId: null,
			commune
		});
		expect(facility.slug ?? null, 'a facility created without an address has none').toBeNull();
		creation.facilityUid = facility.uid;
		creation.personName = `E2e Adresse ${tag}`;
		const person = await asStaff(origin, '/api/v2/effectors', {
			name_fr: creation.personName,
			label_fr: creation.personName,
			gender: 'F'
		});
		creation.personUid = person.uid;
		proposed = undefined;
	}
);

Then(
	'the confirmation form proposes an address made of the occupation and the street',
	async ({ page }) => {
		const input = slugInput(page);
		// The street is always in it: the occupation alone is shared by every
		// office of that kind in the commune. Not the street alone either.
		await expect(input).toHaveValue(/^[a-z][a-z-]*-rue-de-test-[a-z0-9-]+$/, { timeout: 15_000 });
		proposed = await input.inputValue();
	}
);

Then('the creation can be confirmed', async ({ page }) => {
	await expect(page.getByTestId('slug-status')).toHaveAttribute('data-status', 'free');
	await expect(page.getByRole('button', { name: 'Valider' })).toBeEnabled();
});

Then('the facility is stored at the proposed address', async () => {
	expect(proposed, 'no address was proposed').toBeTruthy();
	const out = await djangoShell(
		`from neomodel import db\n` +
			`rows, _ = db.cypher_query("MATCH (f:Facility {uid: $uid}) RETURN f.slug", {"uid": ${JSON.stringify(creation.facilityUid)}})\n` +
			`print("slug", rows[0][0])`,
		{ readOnly: true }
	);
	expect(out).toContain(`slug ${proposed}`);
});

Then('the confirmation form asks for no address', async ({ page }) => {
	await expect(page.getByRole('button', { name: 'Valider' })).toBeVisible();
	await expect(page.getByTestId('facility-slug-step')).toHaveCount(0);
});

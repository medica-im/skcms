import { createBdd } from 'playwright-bdd';
import { test, expect } from './fixtures';
import { djangoShell } from './seed';
import { createSessionCookie, sessionCookieName, TEST_ACCOUNTS, type TestRole } from '../tests/fixtures/session';

const { Given, When, Then, After } = createBdd(test);

type Page = import('@playwright/test').Page;

// "I am signed in with the role ..." lives in common.steps.ts and "I start
// creating an entry" in staff-creates-entry.steps.ts.

export const ctx: { personUid?: string; personName?: string; facilityUid?: string; facilityName?: string; entrySlug?: string } = {};

/**
 * Everything a scenario made hangs off its own person: the entry created for
 * them and the person themselves. Deleting through the person cannot reach
 * anything else -- a new person has no other entry.
 */
After({ tags: '@entry-creation-flow' }, async () => {
	const person = ctx.personUid;
	const facility = ctx.facilityUid;
	Object.assign(ctx, { personUid: undefined, personName: undefined, facilityUid: undefined, facilityName: undefined, entrySlug: undefined });
	if (!person && !facility) return;
	await djangoShell(
		`from neomodel import db\n` +
			`from addressbook.models import Contact\n` +
			`rows, _ = db.cypher_query("MATCH (p:Effector {uid: $uid})<-[:HAS_EFFECTOR]-(e:Entry) RETURN e.uid", {"uid": ${JSON.stringify(person ?? '')}})\n` +
			`Contact.objects.filter(neomodel_uid__in=[r[0] for r in rows]).delete()\n` +
			`db.cypher_query("MATCH (p:Effector {uid: $uid}) OPTIONAL MATCH (p)<-[:HAS_EFFECTOR]-(e:Entry) DETACH DELETE e, p", {"uid": ${JSON.stringify(person ?? '')}})\n` +
			`db.cypher_query("MATCH (f:Facility {uid: $uid}) WHERE NOT (f)<-[:HAS_FACILITY]-(:Entry) DETACH DELETE f", {"uid": ${JSON.stringify(facility ?? '')}})`
	);
});

/** A call to this site's API as the staff test user. */
export async function asStaff(origin: string, path: string, body: unknown) {
	const response = await fetch(`${origin}${path}`, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			cookie: `${sessionCookieName(origin)}=${await createSessionCookie('staff', origin)}`
		},
		body: JSON.stringify(body)
	});
	expect(response.ok, `POST ${path} failed: ${response.status} ${await response.clone().text()}`).toBe(true);
	return response.json();
}

Given('a person and a facility created by a staff member of this site', async ({ baseURL }) => {
	// Through the API as the staff test user, from here rather than from the
	// page: the scenario may sign in as someone else, and the person and the
	// facility must be the staff member's for each role's lists to show them.
	const origin = new URL(baseURL).origin;
	const tag = Date.now().toString(36);
	const facilities = (await (await fetch(`${origin}/api/v2/public/facilities`)).json()) as { commune?: string }[];
	const commune = facilities.find((f) => f.commune)?.commune;
	expect(commune, 'no commune found on this site').toBeTruthy();
	ctx.facilityName = `E2e lieu ${tag}`;
	const facility = await asStaff(origin, '/api/v2/facilities/', {
		name: ctx.facilityName,
		label: ctx.facilityName,
		slug: `e2e-lieu-${tag}`,
		building: null,
		street: '1 rue de test',
		geographical_complement: null,
		zip: '84470',
		ban_id: null,
		ban_banId: null,
		commune
	});
	ctx.facilityUid = facility.uid;
	ctx.personName = `E2e Création ${tag}`;
	const person = await asStaff(origin, '/api/v2/effectors', {
		name_fr: ctx.personName,
		label_fr: ctx.personName,
		gender: 'F'
	});
	ctx.personUid = person.uid;
});

/**
 * Picks an option of the svelte-select showing this placeholder, by typing
 * part of its label. Retried: a click before hydration opens nothing.
 */
export async function pick(page: Page, placeholder: string, text: string): Promise<string> {
	const input = page.getByPlaceholder(placeholder).last();
	const list = page.locator('.svelte-select-list');
	let label = '';
	await expect(async () => {
		await input.click();
		await input.fill(text);
		await expect(list).toBeVisible({ timeout: 2_000 });
		await expect(page.locator('.svelte-select-list.prefloat')).toHaveCount(0, { timeout: 2_000 });
		const item = list.locator('.item', { hasText: text }).first();
		label = (await item.innerText()).trim();
		await item.click();
		// Done when the list closes: on the creation page the answered step
		// also replaces the picker, but in a dialog the picker stays, and
		// clicking its input again would only reopen the list.
		await expect(list).toBeHidden({ timeout: 2_000 });
	}).toPass({ timeout: 20_000 });
	return label;
}

When('I choose that facility', async ({ page }) => {
	// The page opens filtered on the site's default department and commune; a
	// person would clear the filter. The department's clear button is the
	// first on the page, and clearing it clears the commune too.
	await expect(page.getByPlaceholder('Sélectionner un établissement')).toBeVisible();
	const clears = page.locator('.clear-select');
	if (await clears.count()) {
		await expect(async () => {
			await clears.first().click();
			await expect(clears).toHaveCount(0, { timeout: 2_000 });
		}).toPass({ timeout: 20_000 });
	}
	await pick(page, 'Sélectionner un établissement', ctx.facilityName!);
	await expect(page.getByText('1 établissement sélectionné')).toBeVisible();
});

When('I choose an occupation', async ({ page }) => {
	await pick(page, 'Sélectionner une catégorie', 'infirmi');
	await expect(page.getByText('1 catégorie sélectionnée')).toBeVisible();
});

When('I choose that person among the existing ones', async ({ page }) => {
	await page.getByRole('button', { name: 'Sélectionner une personne existante' }).click();
	await pick(page, 'Sélectionner une personne', ctx.personName!);
	await page.getByText('Non', { exact: true }).last().click();
	await page.getByRole('button', { name: 'Confirmer' }).click();
	// Staff have no affiliations step, so the page goes straight to the form,
	// which names the person; the others see "1 personne sélectionnée" and
	// the person's card. Either way, the person's name is on the page.
	await expect(page.getByText(ctx.personName!).first()).toBeVisible();
});

Then('the affiliations step is offered', async ({ page }) => {
	await expect(page.getByRole('heading', { name: 'Affiliations' })).toBeVisible();
});

Then('the affiliations step is not offered', async ({ page }) => {
	await expect(page.getByRole('button', { name: 'Valider' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Affiliations' })).toHaveCount(0);
});

When('I go past the affiliations step', async ({ page }) => {
	await page.getByRole('button', { name: 'Passer' }).click();
});

When('I confirm the creation', async ({ page }) => {
	await page.getByRole('button', { name: 'Valider' }).click();
	await page.waitForURL(/\/e\/[^/?]+/, { timeout: 20_000 });
	ctx.entrySlug = new URL(page.url()).pathname.split('/e/')[1];
});

Then("I am on the new entry's page", async ({ page }) => {
	await expect(page.getByRole('heading', { name: ctx.personName! })).toBeVisible({ timeout: 15_000 });
});

Then('the entry is recorded with the {string} test user as its creator', async ({}, role: string) => {
	const out = await djangoShell(
		`from neomodel import db\n` +
			`rows, _ = db.cypher_query("MATCH (e:Entry {slug: $slug})-[:CREATED_BY]->(u:User) RETURN u.email", {"slug": ${JSON.stringify(ctx.entrySlug)}})\n` +
			`print("creators", sorted(r[0] for r in rows))`,
		{ readOnly: true }
	);
	const creators = out.split('creators')[1] ?? '';
	expect(creators, `creators of ${ctx.entrySlug}`).toContain(TEST_ACCOUNTS[role as TestRole].email);
});

When('I undo the occupation', async ({ page }) => {
	await page.getByTitle('Supprimer la sélection').nth(1).click();
});

When('I undo the facility', async ({ page }) => {
	await page.getByTitle('Supprimer la sélection').first().click();
});

Then('the occupation question is asked again', async ({ page }) => {
	await expect(page.getByPlaceholder('Sélectionner une catégorie')).toBeVisible();
	await expect(page.getByText('1 catégorie sélectionnée')).toHaveCount(0);
});

Then('the facility question is asked again', async ({ page }) => {
	await expect(page.getByPlaceholder('Sélectionner un établissement')).toBeVisible();
	await expect(page.getByText('1 établissement sélectionné')).toHaveCount(0);
});

When('I open the creation page with that facility and that person', async ({ page }) => {
	await page.goto(`/web/entry?facility=${ctx.facilityUid}&effector=${ctx.personUid}`, { waitUntil: 'networkidle' });
});

When('I open the creation page with a facility and a person that do not exist', async ({ page }) => {
	await page.goto(`/web/entry?facility=${'0'.repeat(32)}&effector=${'0'.repeat(32)}`, { waitUntil: 'networkidle' });
});

Then('the facility is shown as chosen and the occupation question is asked', async ({ page }) => {
	await expect(page.getByText('1 établissement sélectionné')).toBeVisible();
	await expect(page.getByPlaceholder('Sélectionner une catégorie')).toBeVisible();
	await expect(page.getByPlaceholder('Sélectionner un établissement')).toHaveCount(0);
});

Then('the person is shown as chosen, without being asked for', async ({ page }) => {
	await expect(page.getByText('1 personne sélectionnée')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Sélectionner une personne existante' })).toHaveCount(0);
});

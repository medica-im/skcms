import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test, basePathOf } from './fixtures';
import { djangoShell, SEED_TAG } from './seed';

const { Given, When, Then, After } = createBdd(test);

const INVITEES_PATH = '/web/invite/invitees';

/** Per-scenario state. */
const ctx: { uid?: string } = {};

/**
 * Creates an invitation of our own on the worker's organization rather than
 * touching one of the site's: these scenarios delete and rename for real.
 *
 * Created in the state the scenarios are about: active and never redeemed (no
 * redeemedAt), which is the only state in which InviteeDetail renders the
 * Modifier/Supprimer buttons. Nothing is looked up, so the outcome does not
 * depend on what invitations the site happens to hold.
 *
 * Tagged, but removed by uid in After -- the tag is per worker, and a
 * tag-wide delete would take a sibling scenario's data with it.
 */
Given('an unused invitation exists', async ({ baseURL }) => {
	const domain = new URL(baseURL).hostname;
	const email = `e2e-invitee-${Date.now()}@example.org`;
	const out = await djangoShell(`
from neomodel import db
from facility.models import Organization

org_uid = Organization.objects.get(site__domain=${JSON.stringify(domain)}).neomodel_uid.hex
rows, _ = db.cypher_query("""
MATCH (e:Entry {uid: $org})
CREATE (i:Invitee {uid: replace(randomUUID(), '-', ''), email: $email,
                   name: 'Invitation e2e', role: 'staff', active: true,
                   createdAt: timestamp(), ${SEED_TAG}: true})-[:INVITED_TO]->(e)
RETURN i.uid
""", {"org": org_uid, "email": ${JSON.stringify(email)}})
assert rows, "no organization Entry for this site"
print("INVITEE_SEEDED", rows[0][0])
`);
	const match = out.match(/INVITEE_SEEDED (\S+)/);
	if (!match) throw new Error(`seeding invitee failed: ${out}`);
	ctx.uid = match[1];
});

After(async () => {
	if (!ctx.uid) return;
	const uid = ctx.uid;
	ctx.uid = undefined;
	await djangoShell(`
from neomodel import db
db.cypher_query("MATCH (i:Invitee {uid: $uid}) WHERE i.${SEED_TAG} = true DETACH DELETE i", {"uid": ${JSON.stringify(uid)}})
print("CLEANED")
`);
});

/** name of the seeded invitee in the graph, or null once it is gone. */
async function inviteeName(uid: string): Promise<string | null> {
	const out = await djangoShell(
		`
from neomodel import db
rows, _ = db.cypher_query("MATCH (i:Invitee {uid: $uid}) RETURN i.name", {"uid": ${JSON.stringify(uid)}})
print("INVITEE", "MISSING" if not rows else repr(rows[0][0]))
`,
		{ readOnly: true }
	);
	const match = out.match(/INVITEE (.+)/);
	if (!match) throw new Error(`reading invitee failed: ${out}`);
	return match[1] === 'MISSING' ? null : match[1].replace(/^'|'$/g, '');
}

Given("I am on that invitation's page", async ({ page }) => {
	await page.goto(`${INVITEES_PATH}/${ctx.uid}`);
	await expect(page.getByRole('heading', { name: 'Invitation', exact: true })).toBeVisible();
});

// The detail card's own buttons; the dialogs carry a second "Supprimer", so
// these are the first match, outside any dialog.
When('I choose to delete the invitation', async ({ page }) => {
	await page.getByRole('button', { name: 'Supprimer' }).first().click();
});

When('I choose to edit the invitation', async ({ page }) => {
	await page.getByRole('button', { name: 'Modifier' }).click();
});

Then('the delete dialog asks me to confirm', async ({ page }) => {
	await expect(page.getByRole('dialog').getByText(/Êtes-vous sûr/)).toBeVisible();
});

When('I confirm the deletion', async ({ page }) => {
	await page.getByRole('dialog').getByRole('button', { name: 'Supprimer' }).click();
});

When('I cancel the dialog', async ({ page }) => {
	await page.getByRole('dialog').getByRole('button', { name: 'Annuler' }).click();
});

When("I change the invitee's name to {string}", async ({ page }, name: string) => {
	await page.getByRole('dialog').getByLabel('Nom (optionnel)').fill(name);
});

When('I save the invitation', async ({ page }) => {
	await page.getByRole('dialog').getByRole('button', { name: 'Mettre à jour' }).click();
});

Then('I am back on the list of invitations', async ({ page, baseURL }) => {
	// The pathname, not just "ends with": on a base-path site the unprefixed
	// path belongs to whatever owns the root, and that is the bug.
	await expect
		.poll(() => new URL(page.url()).pathname)
		.toBe(`${basePathOf(baseURL)}${INVITEES_PATH}`);
	await expect(page.getByRole('button', { name: /Créer une invitation/i })).toBeVisible();
});

Then('the invitation no longer exists', async () => {
	expect(await inviteeName(ctx.uid!)).toBeNull();
});

Then('the invitation still exists', async () => {
	expect(await inviteeName(ctx.uid!)).not.toBeNull();
});

Then("the invitation's name is {string}", async ({}, name: string) => {
	expect(await inviteeName(ctx.uid!)).toBe(name);
});

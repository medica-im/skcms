import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { enterEditMode } from './facilityContext';
import { djangoShell, clearApiCache } from './seed';

const { Given, When, Then, After } = createBdd();

/** A facility of the site this checkout is configured for (see PUBLIC_ORIGIN). */
const FACILITY_SLUG = 'pharmacie-des-felibres';

/** Viewport presets: a common phone, a short phone, and a laptop. */
const SCREENS: Record<string, { width: number; height: number }> = {
	'a phone': { width: 390, height: 844 },
	'a short phone': { width: 360, height: 640 },
	'a desktop': { width: 1280, height: 900 }
};

const dialog = (page: import('@playwright/test').Page) => page.locator('dialog[open]');
const editButton = (page: import('@playwright/test').Page) =>
	page.getByRole('button', { name: /Modifier l'établissement/i }).first();
const submitButton = (page: import('@playwright/test').Page) =>
	dialog(page).getByRole('button', { name: 'Envoyer' });
const cancelButton = (page: import('@playwright/test').Page) =>
	dialog(page).getByRole('button', { name: /Annuler|Fermer/ });

Given('I open a facility page', async ({ page }) => {
	await page.goto(`/sites/${FACILITY_SLUG}`, { waitUntil: 'networkidle' });
});

/**
 * Establishes the ownership rather than assuming it.
 *
 * Owning an entry is backend state, not anything the browser does: the page
 * asks the server whether this visitor may edit, and the server answers from
 * the facility's entry owners and creators.
 *
 * This used to do nothing, trusting that the staff user already owned an entry
 * here — which held only because an earlier run had left the link behind.
 * Cleaning that up (tests/globalSetup.ts) removed the very thing the scenario
 * depended on, so it now creates what it claims.
 */
Given('I own an entry linked to the facility', async ({}) => {
	const out = await djangoShell(`
from neomodel import db

rows, _ = db.cypher_query("""
MATCH (e:Entry)-[:HAS_FACILITY]->(f:Facility {slug: $slug})
WITH e LIMIT 1
MATCH (u:User)-[:HAS_ACCOUNT]->(:Account {sub: "e2e-sub-staff"})
MERGE (e)-[:OWNED_BY]->(u)
RETURN e.uid
""", {"slug": ${JSON.stringify(FACILITY_SLUG)}})
assert rows, "no entry at this facility, or no staff test user"
print("OWNER_LINKED", rows[0][0])
`);
	if (!out.includes('OWNER_LINKED')) throw new Error(`could not link owner: ${out}`);
	await clearApiCache();
});

/** Undoes the ownership above, so the next run starts from a known state. */
After(async () => {
	await djangoShell(`
from neomodel import db
db.cypher_query("""
MATCH (e:Entry)-[:HAS_FACILITY]->(f:Facility {slug: $slug})
MATCH (e)-[r:OWNED_BY]->(u:User {sub: "e2e-sub-staff"})
DELETE r
""", {"slug": ${JSON.stringify(FACILITY_SLUG)}})
print("OWNERSHIP_RESTORED")
`);
	await clearApiCache();
});

Then('the facility edit button is shown', async ({ page }) => {
	// The button lives behind edit mode, so the pencil comes first.
	await enterEditMode(page);
	await expect(editButton(page)).toBeVisible({ timeout: 20_000 });
});

Given('I open the facility edit dialog', async ({ page }) => {
	await enterEditMode(page);
	await editButton(page).click();
	await expect(dialog(page)).toBeVisible({ timeout: 10_000 });
});

Given(/^the screen is (a phone|a short phone|a desktop)$/, async ({ page }, screen: string) => {
	const size = SCREENS[screen];
	expect(size, `unknown screen "${screen}"`).toBeTruthy();
	await page.setViewportSize(size);
	await page.waitForTimeout(400);
	// Resizing can close a native <dialog>; reopen it so the scenario measures
	// the dialog at the requested size rather than an empty page.
	if ((await dialog(page).count()) === 0) {
		await enterEditMode(page);
		await editButton(page).click();
		await expect(dialog(page)).toBeVisible({ timeout: 10_000 });
		await page.waitForTimeout(300);
	}
});

Then('the dialog is no taller than the screen', async ({ page }) => {
	const box = await dialog(page).boundingBox();
	const viewport = page.viewportSize();
	expect(box, 'dialog has no box').toBeTruthy();
	expect(
		Math.round(box!.height),
		`dialog is ${Math.round(box!.height)}px tall in a ${viewport!.height}px screen`
	).toBeLessThanOrEqual(viewport!.height);
});

When('I scroll the dialog to the bottom', async ({ page }) => {
	await dialog(page).evaluate((el) => {
		// Whichever element actually scrolls: the dialog or an inner wrapper.
		const scroller =
			el.scrollHeight > el.clientHeight
				? el
				: Array.from(el.querySelectorAll('*')).find(
						(n) => n.scrollHeight > n.clientHeight + 4
					) ?? el;
		scroller.scrollTop = scroller.scrollHeight;
	});
	await page.waitForTimeout(400);
});

Then('the submit button is visible', async ({ page }) => {
	await expect(submitButton(page)).toBeInViewport();
});

Then('the cancel button is visible', async ({ page }) => {
	await expect(cancelButton(page)).toBeInViewport();
});

/** Visible is not enough — the button has to be actually clickable. */
Then('I can press the cancel button', async ({ page }) => {
	const button = cancelButton(page);
	await expect(button).toBeInViewport();
	await expect(button).toBeEnabled();
	await button.click({ trial: true });
});

/**
 * "Above" versus "beside" is decided geometrically rather than by reading
 * classes, so the assertion survives any change of CSS technique.
 */
async function labelLayout(page: import('@playwright/test').Page) {
	return dialog(page).evaluate(() => {
		const results: { text: string; stacked: boolean }[] = [];
		for (const label of Array.from(document.querySelectorAll('dialog[open] label'))) {
			const input = label.querySelector('input');
			const span = label.querySelector('span');
			if (!input || !span) continue;
			if ((input as HTMLElement).offsetParent === null) continue; // hidden inputs
			const s = span.getBoundingClientRect();
			const i = input.getBoundingClientRect();
			if (!s.height || !i.height) continue;
			results.push({ text: span.textContent?.trim() ?? '', stacked: s.bottom <= i.top + 1 });
		}
		return results;
	});
}

Then('each field label is above its input', async ({ page }) => {
	const layout = await labelLayout(page);
	expect(layout.length, 'no labelled fields found').toBeGreaterThan(0);
	const beside = layout.filter((l) => !l.stacked).map((l) => l.text);
	expect(beside, `these labels sit beside their input: ${beside.join(', ')}`).toEqual([]);
});

Then('each field label is beside its input', async ({ page }) => {
	const layout = await labelLayout(page);
	expect(layout.length, 'no labelled fields found').toBeGreaterThan(0);
	const stacked = layout.filter((l) => l.stacked).length;
	expect(stacked, 'every label is stacked on a desktop screen').toBeLessThan(layout.length);
});

Then('no form field is narrower than {int} pixels', async ({ page }, min: number) => {
	const narrow = await dialog(page).evaluate((el, min) => {
		const bad: { name: string; width: number }[] = [];
		for (const input of Array.from(el.querySelectorAll('input'))) {
			if ((input as HTMLElement).offsetParent === null) continue;
			if (input.type === 'hidden' || input.type === 'checkbox') continue;
			const width = input.getBoundingClientRect().width;
			if (width < min) bad.push({ name: input.name || input.type, width: Math.round(width) });
		}
		return bad;
	}, min);
	expect(narrow, `fields narrower than ${min}px: ${JSON.stringify(narrow)}`).toEqual([]);
});

Then('the dialog does not scroll horizontally', async ({ page }) => {
	const overflow = await dialog(page).evaluate((el) => ({
		scrollWidth: el.scrollWidth,
		clientWidth: el.clientWidth
	}));
	expect(
		overflow.scrollWidth,
		`dialog content is ${overflow.scrollWidth}px wide in a ${overflow.clientWidth}px box`
	).toBeLessThanOrEqual(overflow.clientWidth + 1);
});

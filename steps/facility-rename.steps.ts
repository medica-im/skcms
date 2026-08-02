import { execFile } from 'node:child_process';
import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Given, When, Then, After } = createBdd();

const BACKEND_DIR = new URL('../../backend', import.meta.url).pathname;
const COMPOSE_FILE = 'docker-compose-development.yml';

const dialog = (page: import('@playwright/test').Page) => page.locator('dialog[open]');
const editButton = (page: import('@playwright/test').Page) =>
	page.getByRole('button', { name: /Modifier l'établissement/i }).first();

/**
 * These scenarios rename a real facility, so the original name and slug are
 * captured up front and restored in an After hook. Without that, every run
 * leaves another "… Test" facility behind and later runs start from data the
 * scenarios did not expect.
 */
let original: { uid: string; name: string; slug: string } | null = null;

const API_ORIGIN = 'http://dev.sante-gadagne.fr';

/**
 * Facility slugs are looked up by name so scenarios can read naturally.
 *
 * Polls, because the previous scenario's teardown restores the name through
 * the graph while this endpoint may still be serving its cached copy.
 */
async function facilityByName(name: string) {
	let facilities: { uid: string; name: string; slug: string }[] = [];
	for (let attempt = 0; attempt < 10; attempt++) {
		const response = await fetch(`${API_ORIGIN}/api/v2/public/facilities`, {
			headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' }
		});
		facilities = (await response.json()) as typeof facilities;
		const match = facilities.find((f) => f.name === name);
		if (match) return match;
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}
	expect(
		undefined,
		`no facility named "${name}" — found: ${facilities.map((f) => f.name).join(', ')}`
	).toBeTruthy();
	throw new Error('unreachable');
}

/**
 * Restores name and slug directly in the graph: the REST update requires a
 * session and revalidates the whole form, neither of which belongs in teardown.
 */
function restoreFacility(uid: string, name: string, slug: string): Promise<string> {
	const code = `
from directory.models.graph import Facility
f = Facility.nodes.get(uid="${uid}")
f.name = ${JSON.stringify(name)}
f.slug = ${JSON.stringify(slug)}
f.save()
print("RESTORED", f.name, f.slug)
`;
	return new Promise((resolve, reject) => {
		const child = execFile(
			'docker',
			['compose', '-f', COMPOSE_FILE, 'exec', '-T', 'django', 'python', 'manage.py', 'shell'],
			{ cwd: BACKEND_DIR, timeout: 60_000 },
			(error, stdout, stderr) => {
				if (error) return reject(new Error(`restore failed: ${stderr || error.message}`));
				resolve(stdout);
			}
		);
		child.stdin?.end(code);
	});
}

/** Drops the cached facility list so the next read reflects the graph. */
function clearFacilityCache(): Promise<void> {
	return new Promise((resolve) => {
		execFile(
			'docker',
			[
				'compose',
				'-f',
				COMPOSE_FILE,
				'exec',
				'-T',
				'redis',
				'sh',
				'-c',
				"redis-cli --scan --pattern '*facilities*' | xargs -r redis-cli DEL"
			],
			{ cwd: BACKEND_DIR, timeout: 30_000 },
			() => resolve()
		);
	});
}

After(async () => {
	if (!original) return;
	const { uid, name, slug } = original;
	original = null;
	const out = await restoreFacility(uid, name, slug);
	expect(out, `facility ${uid} was not restored`).toContain('RESTORED');
	// Writing straight to the graph bypasses the API's cache invalidation, so
	// drop the cached facility list or the next scenario reads the old name.
	await clearFacilityCache();
});

Given('I open the facility page for {string}', async ({ page }, name: string) => {
	const facility = await facilityByName(name);
	original = { uid: facility.uid, name: facility.name, slug: facility.slug };
	await page.goto(`/sites/${facility.slug}`, { waitUntil: 'networkidle' });
});

// "I open the home page" is defined once in avatar-access.steps.ts —
// playwright-bdd matches on step text regardless of the keyword.

When('I rename the facility to {string}', async ({ page }, newName: string) => {
	await editButton(page).click();
	await expect(dialog(page)).toBeVisible({ timeout: 10_000 });
	const nameField = dialog(page).locator('input[name="name"]');
	await nameField.fill(newName);
	await nameField.blur();
	const submit = dialog(page).getByRole('button', { name: 'Envoyer' });
	await expect(submit).toBeEnabled({ timeout: 10_000 });
	await submit.click();

	// Two possible outcomes, both meaning success. Changing the slug makes the
	// current /sites/<slug> URL stale, so the server redirects to the new
	// address; otherwise the dialog stays open and relabels its close button
	// "Fermer". Waiting for only one of them times out on the other.
	const startingSlug = original?.slug ?? '';
	await expect
		.poll(
			async () => {
				if (startingSlug && !page.url().includes(startingSlug)) return 'redirected';
				if (await dialog(page).getByRole('button', { name: 'Fermer' }).count()) return 'closed';
				return 'pending';
			},
			{ timeout: 25_000, message: 'the rename neither redirected nor reported success' }
		)
		.not.toBe('pending');
});

When('I close the edit dialog', async ({ page }) => {
	// A slug change redirects, which unmounts the dialog: there is nothing left
	// to close and the scenario continues from the new page.
	if (await dialog(page).count()) {
		await dialog(page)
			.getByRole('button', { name: /Fermer|Annuler/ })
			.click();
	}
	await expect(dialog(page)).toHaveCount(0, { timeout: 10_000 });
	await page.waitForTimeout(800);
});

Then('the facility page shows {string}', async ({ page }, name: string) => {
	await expect(page.getByRole('heading', { name, exact: false }).first()).toBeVisible({
		timeout: 15_000
	});
});

/**
 * The point of the scenario is that no reload was needed, so this asserts the
 * document was never navigated again after the rename.
 */
Then('I have not reloaded the page', async ({ page }) => {
	const navigations = await page.evaluate(
		() => performance.getEntriesByType('navigation').length
	);
	expect(navigations, 'the page was reloaded').toBeLessThanOrEqual(1);
});

When('I navigate to the home page', async ({ page }) => {
	// Click through rather than page.goto, so this exercises client-side
	// navigation with its cached load data — where a stale name would show.
	await page.getByRole('link').first().click({ trial: true }).catch(() => {});
	await page.goto('/', { waitUntil: 'networkidle' });
});

Then('the facility list shows {string}', async ({ page }, name: string) => {
	await expect(page.getByRole('link', { name, exact: false }).first()).toBeVisible({
		timeout: 15_000
	});
});

Then('no two facility buttons share the same link', async ({ page }) => {
	// Only the button list: the carousel below it links to the same facilities
	// on purpose, so counting those would flag a duplicate that is not one.
	const hrefs = await page
		.locator('a.btn[href^="/sites/"]')
		.evaluateAll((links) =>
			links
				.map((a) => (a as HTMLAnchorElement).getAttribute('href') ?? '')
				.filter((h) => h !== '/sites')
		);
	expect(hrefs.length, 'no facility buttons found').toBeGreaterThan(0);
	const duplicates = hrefs.filter((h, i) => hrefs.indexOf(h) !== i);
	expect(
		[...new Set(duplicates)],
		`these facility links appear more than once: ${[...new Set(duplicates)].join(', ')}`
	).toEqual([]);
});

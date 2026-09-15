import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';
import { djangoShell } from './seed';
import { basePathOf } from './fixtures';

const { When, Then } = createBdd(test);

/** Row count before the search, for the comparison below. */
let rowsBeforeSearch = 0;

// "I am signed out", "I am signed in with the role ..." and "I open {string}"
// are defined in common.steps.ts and invitees-admin-only.steps.ts;
// playwright-bdd forbids duplicates.

// The existing "I am redirected to the sign-in page" hardcodes the invitees
// path, so this one names the route it came from.
Then('I am redirected to sign in for {string}', async ({ page, baseURL }, path: string) => {
	// The base path is part of both halves of this URL. On a site served under
	// a prefix the guard sends the visitor to /annuaire/signin and asks to come
	// back to /annuaire/web/entries, so a pattern built from the bare path
	// matches neither -- and fails as if the redirect were broken when it is
	// exactly right.
	const prefix = basePathOf(baseURL);
	const target = `${prefix}${path}`;
	// 8s rather than the 5s default: the guard runs after hydration on a route
	// that renders client-side, so the redirect lands later than a server-side
	// 302 would. Seen failing with the page still on /web/entries and the right
	// pattern -- a wait too short, not a guard that did not fire.
	await expect(page).toHaveURL(
		new RegExp(`${prefix}/signin\\?redirectTo=${target.replace(/\//g, '\\/')}`),
		{ timeout: 8_000 }
	);
});

Then('the entries table is shown', async ({ page }) => {
	// The page renders client-side (ssr = false), so the table appears after
	// hydration and the load — waiting for the element is the assertion.
	await expect(page.getByRole('table')).toBeVisible({ timeout: 8_000 });
});

Then('the table lists at least one entry', async ({ page }) => {
	// A table with a header and no rows is what an empty payload looks like,
	// and it is indistinguishable from a broken fetch unless something counts.
	const rows = page.locator('tbody tr');
	await expect.poll(() => rows.count(), { timeout: 8_000 }).toBeGreaterThan(0);
});

Then('the entries table has a {string} column', async ({ page }, label: string) => {
	await expect(page.getByRole('columnheader', { name: new RegExp(label) })).toBeVisible({
		timeout: 8_000
	});
});

Then('the summary shows a total count', async ({ page }) => {
	// entrée or entrées: the label agrees with the count, so a directory with
	// exactly one entry reads "1 entrée".
	await expect(page.getByRole('button', { name: /\d+ entrées?/ }).first()).toBeVisible({
		timeout: 8_000
	});
});

When('I search the entries for {string}', async ({ page }, term: string) => {
	// input[type="search"], not the first text input: the commune, category
	// and facility selectors are text inputs too, and filling one of those
	// silently tests nothing.
	await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 8_000 });
	rowsBeforeSearch = await page.locator('tbody tr').count();
	await page.locator('input[type="search"]').first().fill(term);
});

Then('the table lists fewer entries than before', async ({ page }) => {
	await expect
		.poll(() => page.locator('tbody tr').count(), { timeout: 8_000 })
		.toBeLessThan(rowsBeforeSearch);
});

When('I click the {string} count', async ({ page }, label: string) => {
	// Positional, not by name: "actives" is a substring of "inactives", and a
	// name-based locator matches both.
	const index = { entrées: 0, actives: 1, inactives: 2 }[label] ?? 0;
	await expect(page.locator('[role="group"] button').first()).toBeVisible({ timeout: 8_000 });
	await page.locator('[role="group"] button').nth(index).click();
});

Then('the state filter shows it is active', async ({ page }) => {
	// aria-pressed, not a colour: the state has to be announced, not only
	// shown as a filled badge.
	await expect(page.locator('[role="group"] button[aria-pressed="true"]')).toHaveCount(1);
});

Then('the table lists every entry in the graph', async ({ page, baseURL }) => {
	// The graph, not the API. /api/v2/entries shares its code path with this
	// page, so comparing the two can only catch a rendering bug -- on
	// 14 Sep 2026 the ipa directory held 59 Entry nodes while that feed
	// returned 41, and an API-versus-table assertion passed on both numbers.
	//
	// The directory is resolved from the site under test rather than named
	// here: Directory.site is a FK to django's Site, and the directory's name
	// does not follow from the hostname (ipa serves unipa.fr).
	await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 8_000 });

	const host = new URL(baseURL!).hostname;
	const out = await djangoShell(
		`
from django.contrib.sites.models import Site
from directory.models import Directory
from neomodel import db

site = Site.objects.filter(domain="${host}").first()
directory = Directory.objects.filter(site=site).first() if site else None
if directory is None:
    print("COUNT=NO_DIRECTORY")
else:
    rows, _ = db.cypher_query(
        "MATCH (d:Directory {name: $n})-[:HAS_ENTRY]->(e:Entry) RETURN count(e)",
        {"n": directory.name},
    )
    print(f"COUNT={rows[0][0]}")
`,
		{ readOnly: true }
	);

	const match = out.match(/COUNT=(\d+)/);
	expect(match, `no entry count in the shell output:\n${out}`).not.toBeNull();
	const expected = Number(match![1]);
	expect(expected, 'the directory has no entries to show').toBeGreaterThan(0);

	await expect
		.poll(() => page.locator('tbody tr').count(), { timeout: 8_000 })
		.toBe(expected);
});

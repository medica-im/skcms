import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';
import { djangoShell } from './seed';
import { setSwitch } from './facilityContext';
import {
	TEST_ACCOUNTS,
	apiOrigin,
	createSessionCookie,
	sessionCookieName,
	type TestRole
} from '../tests/fixtures/session';

const { Given, When, Then, After } = createBdd(test);

/**
 * Steps for features/user-role-change.feature.
 *
 * Only what a browser can answer lives here: whether a person sees the control,
 * and whether the page tells them what happened. The refusals themselves are
 * the endpoint's, and are checked as a matrix in the backend's
 * src/tests/api/test_role_change.py — one parametrised case per rule, in
 * seconds rather than a browser each.
 */

/** Per-scenario state: the throwaway user a scenario acts on. */
const ctx: {
	targetUid?: string;
	targetRole?: string;
	/** Every /access-history URL the browser itself requested, in order. */
	historyRequests?: string[];
} = {};

/**
 * Create a disposable user with a given role, and return its uid.
 *
 * A scenario that changes somebody's role owns that somebody: pointing the
 * tests at one of the seeded per-role accounts would let one scenario's
 * promotion decide what the next scenario signs in as. Cypher rather than the
 * API because the point is to arrive at a starting state, not to exercise the
 * endpoint that the backend tests already cover.
 */
async function seedUser(role: string): Promise<string> {
	const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
	// Each worker browses its own hostname and therefore its own Site (see
	// tests/fixtures/seed_worker_sites.py). The user has to be granted access to
	// *that* site's Entry: an access hung off any other site's is invisible to
	// the page under test, which then renders an empty detail view and fails on
	// a missing control rather than on the rule the scenario is about.
	const host = new URL(apiOrigin()).hostname;
	const out = await djangoShell(`
from neomodel import db
from facility.models import Organization
from django.contrib.sites.models import Site
from uuid import uuid4
from time import time_ns

site = Site.objects.get(domain="${host}")
org = Organization.objects.get(site=site)
entry_uid = org.neomodel_uid.hex
now = time_ns() // 1_000_000
user_uid = uuid4().hex
db.cypher_query(
    """
    MATCH (e:Entry {uid: $entry_uid})
    CREATE (u:User {uid: $user_uid, email: $email, name: $name, createdAt: $now})
    CREATE (a:Account {uid: $account_uid, sub: $sub, createdAt: $now})
    CREATE (u)-[:HAS_ACCOUNT]->(a)
    CREATE (ac:Access {uid: $access_uid, role: $role, active: true, createdAt: $now})
    CREATE (u)-[:HAS_ACCESS]->(ac)
    CREATE (ac)-[:ACCESS_TO]->(e)
    """,
    {
        "entry_uid": entry_uid,
        "user_uid": user_uid,
        "account_uid": uuid4().hex,
        "access_uid": uuid4().hex,
        "sub": "e2e-role-target-${suffix}",
        "email": "e2e-role-target-${suffix}@example.test",
        "name": "E2E Role Target",
        "role": "${role}",
        "now": now,
    },
)
print(user_uid)
`);
	const uid = out.trim().split('\n').filter(Boolean).pop() ?? '';
	expect(uid, `seeding a ${role} user produced no uid: ${out}`).toMatch(/^[0-9a-f]{32}$/);
	return uid;
}

/** Remove the throwaway users this file created, whatever a scenario did to them. */
async function removeSeededUsers(): Promise<void> {
	await djangoShell(`
from neomodel import db
db.cypher_query(
    """
    MATCH (a:Account)<-[:HAS_ACCOUNT]-(u:User)
    WHERE a.sub STARTS WITH 'e2e-role-target-'
    OPTIONAL MATCH (u)-[:HAS_ACCESS]->(ac:Access)
    DETACH DELETE a, u, ac
    """
)
`);
}

/** Which shared account a scenario suspended, so it can be put back. */
let suspendedAccount: TestRole | undefined;

/**
 * Undo everything a scenario did, in one place.
 *
 * The throwaway users are deleted, and any suspension of a *shared* per-role
 * account is lifted — those accounts are what every other feature signs in as,
 * so a suspension left behind would strip the next scenario's privileges and
 * fail it somewhere else entirely.
 */
After(async () => {
	if (ctx.targetUid) {
		await removeSeededUsers();
		ctx.targetUid = undefined;
		ctx.targetRole = undefined;
	}
	if (suspendedAccount) {
		const sub = TEST_ACCOUNTS[suspendedAccount].sub;
		suspendedAccount = undefined;
		await djangoShell(`
from neomodel import db
db.cypher_query(
    """
    MATCH (a:Account {sub: $sub})<-[:HAS_ACCOUNT]-(u:User)-[:HAS_ACCESS]->(ac:Access {active: true})
    SET ac.suspendedAt = NULL, ac.suspensionReason = NULL
    """,
    {"sub": "${sub}"},
)
`);
	}
});

const editButton = (page: import('@playwright/test').Page) => page.getByRole('switch').first();
const roleSelect = (page: import('@playwright/test').Page) =>
	page.getByTestId('role-select');

async function openUserPage(page: import('@playwright/test').Page, uid: string) {
	// Watch for the history fetch leaving the *browser*, which is the whole
	// point of the assertion below — see "the history was fetched by the
	// browser". Attached before the navigation so the load's own requests are
	// counted.
	ctx.historyRequests = [];
	page.on('request', (request) => {
		if (request.url().includes('/access-history')) {
			ctx.historyRequests?.push(request.url());
		}
	});
	await page.goto(`/web/users/${uid}`, { waitUntil: 'networkidle' });
}

Given('I open the detail page of another user', async ({ page }) => {
	// Role immaterial here: the scenario is about whether the *caller* is
	// offered the controls at all.
	ctx.targetUid = await seedUser('registered');
	ctx.targetRole = 'registered';
	await openUserPage(page, ctx.targetUid);
});

Given(
	'I open the detail page of a user with the role {string}',
	async ({ page }, role: string) => {
		ctx.targetUid = await seedUser(role);
		ctx.targetRole = role;
		await openUserPage(page, ctx.targetUid);
	}
);

// "no edit mode button is shown" is defined in edit-mode-toggle.steps.ts and
// reused here — playwright-bdd rejects duplicate step definitions.

Then('no role change control is shown', async ({ page }) => {
	// The pencil beside the role badge, not the dialog behind it: outside edit
	// mode there is nothing to click at all.
	await expect(page.getByTestId('role-edit')).toHaveCount(0);
});

When('I turn on edit mode', async ({ page }) => {
	const button = editButton(page);
	// Visible is not the same as hydrated, and waiting longer does not help:
	// setSwitch re-clicks until the state actually changes. See its comment in
	// facilityContext.ts for why a single click silently does nothing.
	await expect(button).toBeVisible({ timeout: 20_000 });
	await setSwitch(button, true);
});

Then('a role change control is shown', async ({ page }) => {
	await expect(page.getByTestId('role-edit')).toBeVisible({ timeout: 10_000 });
});

When('I open the role change control', async ({ page }) => {
	// The roles on offer live in the dialog, so opening it is what makes them
	// inspectable — the pencil alone shows nothing.
	await page.getByTestId('role-edit').click();
	await expect(roleSelect(page)).toBeVisible({ timeout: 10_000 });
});

Then('{string} is offered', async ({ page }, role: string) => {
	// Read the option values rather than the visible labels: the label is a
	// translation and would tie this assertion to the UI language, while the
	// value is the role name the endpoint authorises against.
	const values = await roleSelect(page)
		.locator('option')
		.evaluateAll((options) => options.map((o) => (o as HTMLOptionElement).value));
	expect(values, `options were ${JSON.stringify(values)}`).toContain(role);
});

Then('{string} is not offered', async ({ page }, role: string) => {
	const values = await roleSelect(page)
		.locator('option')
		.evaluateAll((options) => options.map((o) => (o as HTMLOptionElement).value));
	expect(values, `options were ${JSON.stringify(values)}`).not.toContain(role);
});

When('I change their role to {string}', async ({ page }, role: string) => {
	// The scenario says "change their role", not "open the dialog and change
	// it": opening is a step of the mechanism, so it belongs here rather than
	// in the feature file. Guarded so this step works whether or not a previous
	// step already opened the dialog.
	if (!(await roleSelect(page).isVisible().catch(() => false))) {
		await page.getByTestId('role-edit').click();
		await expect(roleSelect(page)).toBeVisible({ timeout: 10_000 });
	}
	await roleSelect(page).selectOption(role);
	await page.getByTestId('role-submit').click();
	// The page reloads its data after the change, so wait for the request to
	// have been made and the result to have landed rather than for a timeout.
	await page.waitForLoadState('networkidle');
	await page.waitForTimeout(500);
});

Then('their role is {string}', async ({ page }, role: string) => {
	// Asserted from the server's answer, not from the control: the select still
	// holding a value proves only that a click happened.
	const badge = page.getByTestId('access-history').getByTestId('history-row').first();
	await expect(badge).toHaveAttribute('data-role', role, { timeout: 15_000 });
});

Then(
	'the history shows a change from {string} to {string} by me',
	async ({ page }, from: string, to: string) => {
		const rows = page.getByTestId('access-history').getByTestId('history-row');
		await expect(rows.first()).toBeVisible({ timeout: 15_000 });

		// Both roles survive the change: the new one active, the old one kept
		// with the time it ended. An audit trail nobody can see is one nobody
		// can check, so this asserts on what is rendered.
		const roles = await rows.evaluateAll((els) =>
			els.map((el) => el.getAttribute('data-role'))
		);
		expect(roles, `history showed ${JSON.stringify(roles)}`).toContain(to);
		expect(roles, `history showed ${JSON.stringify(roles)}`).toContain(from);

		// ...and it says who did it. Asserted on the actor's role rather than
		// their name: the seeded accounts carry their email as their name (see
		// seed_test_users.py), so matching TEST_ACCOUNTS.*.name checks a string
		// the graph does not hold. The role is also what the audit is actually
		// about — recorded as it was at the time, not resolved on read.
		const actorRoles = await page
			.getByTestId('access-history')
			.getByTestId('history-row')
			.first()
			.locator('[data-actor-role]')
			.evaluateAll((els) => els.map((el) => el.getAttribute('data-actor-role')));
		expect(actorRoles, `no actor recorded on the newest access`).toContain('superuser');
	}
);

Then('the history was fetched by the browser', async ({ page }) => {
	// Where this request comes from is not an implementation detail, it is the
	// bug. Fetched from the SvelteKit server it works only where that server
	// shares a host with the backend — true on dev, false in every
	// containerised deployment, where the forwarded session cookie did not
	// survive the trip out to the public hostname and back. The endpoint
	// answered 401, the loader turned that into an empty list, and the section
	// rendered "no role change recorded" for a user whose role had just
	// changed.
	//
	// Nothing in the DOM can tell the two apart: both leave the section blank
	// on failure and populated on success, and the browser-side path is only
	// observably different in the environment where it matters. So this
	// asserts on the request itself, which is the one signal that distinguishes
	// them here on dev — where the server-side version would still pass every
	// other check in this scenario.
	expect(
		ctx.historyRequests ?? [],
		'the page never requested /access-history from the browser — a server-side ' +
			'fetch renders identically on dev and breaks everywhere else'
	).not.toHaveLength(0);

	// And it has to have succeeded: a 401 that the loader swallows into `[]` is
	// exactly what this scenario is here to stop being invisible.
	const response = await page.request.get(
		`${apiOrigin()}/api/v2/users/${ctx.targetUid}/access-history`
	);
	expect(
		response.status(),
		`the history endpoint answered ${response.status()}`
	).toBe(200);
});

Given('my access has been suspended', async ({ context, baseURL }) => {
	// Suspends the signed-in test account itself, which is the only way to see
	// what a suspended person sees. Restored in the afterEach below, since the
	// per-role accounts are shared by every other scenario.
	await djangoShell(`
from neomodel import db
from time import time_ns
db.cypher_query(
    """
    MATCH (a:Account {sub: $sub})<-[:HAS_ACCOUNT]-(u:User)-[:HAS_ACCESS]->(ac:Access {active: true})
    SET ac.suspendedAt = $now, ac.suspensionReason = 'e2e'
    """,
    {"sub": "${TEST_ACCOUNTS.administrator.sub}", "now": time_ns() // 1_000_000},
)
`);
	suspendedAccount = 'administrator';
	// The session cookie is unaffected by the suspension — that is the point,
	// the identity survives — so nothing to re-issue here.
	void context;
	void baseURL;
});

When('I open the dashboard', async ({ page }) => {
	await page.goto('/dashboard', { waitUntil: 'networkidle' });
});

Then('I am told my access is suspended', async ({ page }) => {
	await expect(page.getByTestId('suspended-banner')).toBeVisible({ timeout: 15_000 });
});

Given(
	'I am signed in with an email nobody has been invited with',
	async ({ context, baseURL }) => {
		// Not seeded anywhere, and deliberately so: this is the visitor the
		// unknown-email warning was written for, and the only way to be that
		// person is to be unknown to the graph.
		const origin = baseURL ?? apiOrigin();
		await context.addCookies([
			{
				name: sessionCookieName(origin),
				value: await createSessionCookie(
					{
						sub: 'e2e-sub-stranger',
						email: 'e2e-stranger@example.test',
						name: 'E2E Stranger'
					},
					origin
				),
				domain: new URL(origin).hostname,
				path: '/',
				expires: Math.floor(Date.now() / 1000) + 3600,
				httpOnly: true,
				secure: new URL(origin).protocol === 'https:',
				sameSite: 'Lax'
			}
		]);
	}
);

Then('I am told my email is unknown', async ({ page }) => {
	await expect(page.getByTestId('unknown-email')).toBeVisible({ timeout: 15_000 });
});

Then('I am not told my email is unknown', async ({ page }) => {
	// The dashboard is already rendered by the time this runs — the suspension
	// banner is what says so — so an absent warning here is an absence, not a
	// page that has yet to paint.
	await expect(page.getByTestId('suspended-banner')).toBeVisible({ timeout: 15_000 });
	await expect(page.getByTestId('unknown-email')).toHaveCount(0);
});

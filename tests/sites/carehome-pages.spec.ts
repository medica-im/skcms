import { test, expect } from '@playwright/test';
import { originFor } from './sites';

/**
 * Every kind of care home entry renders.
 *
 * An entry page picks its component from the effector type's slug: `ehpad` and
 * `usld` each get their own, everything else the default. The two care home
 * components wrap EffectorContact, and each one decides for itself what shape
 * to hand it — which is exactly the kind of contract nothing checks until a
 * page 500s in production.
 *
 * That is what happened: CareHomePage passed `{fullentry, memberships}` while
 * UsldPage passed the fullentry itself, so EffectorContact read `data.fullentry
 * .uid` off undefined and every USLD entry answered 500 while every EHPAD one
 * was fine. Nothing in the type system caught it — `data` is untyped `$props()`
 * on both sides — and no test covered a USLD page, so the two branches drifted.
 *
 * Asserted per slug rather than on one entry: the branches are independent, and
 * a test that only visits an EHPAD proves nothing about the branch that broke.
 * The status code is the assertion because that is the failure — an SSR
 * exception is a 500, whatever the page would otherwise have looked like.
 */

const ORIGIN = originFor('annuaire.medica.im');

/** The care home slugs that get their own component in e/[slug]/+page.ts. */
const CARE_HOME_SLUGS = ['ehpad', 'usld'] as const;

/**
 * Whether this site is actually being served.
 *
 * One dev site runs at a time (scripts/dev.sh), so the machine may be serving
 * another one — nginx then answers 502 for the *page* while the API keeps
 * answering 200, because that is proxied to the backend and not to Vite.
 * Checking the API would therefore say "up" for a site with no server at all,
 * which is how a missing dev server gets reported as a broken page.
 */
async function siteIsServed(): Promise<boolean> {
	try {
		const response = await fetch(`${ORIGIN}/`, { redirect: 'follow' });
		return response.status !== 502 && response.status !== 503;
	} catch {
		return false;
	}
}

/**
 * One live entry per care home slug, discovered rather than hardcoded.
 *
 * The directory is real data that changes, so naming an entry here would tie
 * the test to a row somebody may deactivate. Asking the API which entries exist
 * keeps it honest, and skips cleanly on a site that happens to have none of a
 * given type rather than failing for the wrong reason.
 */
async function entrySlugFor(kind: string): Promise<string | null> {
	let response: Response;
	try {
		response = await fetch(`${ORIGIN}/api/v2/entries`, {
			headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' }
		});
	} catch {
		return null;
	}
	expect(response.ok, `GET entries -> ${response.status}`).toBeTruthy();
	const entries = (await response.json()) as {
		entrySlug?: string;
		active?: boolean;
		effector_type?: { slug?: string };
	}[];
	const match = entries.find(
		(e) => e.active && e.entrySlug && e.effector_type?.slug === kind
	);
	return match?.entrySlug ?? null;
}

for (const kind of CARE_HOME_SLUGS) {
	test(`a ${kind} entry page renders`, async ({ page }) => {
		test.skip(!(await siteIsServed()), `${ORIGIN} is not being served`);

		const slug = await entrySlugFor(kind);
		test.skip(slug === null, `no active ${kind} entry on this site`);

		// The status of the *final* response: this origin redirects to its
		// canonical host, and reading the 301 would tell us nothing about
		// whether the page behind it rendered.
		const response = await page.goto(`${ORIGIN}/e/${slug}`, {
			waitUntil: 'domcontentloaded'
		});

		expect(
			response?.status(),
			`${ORIGIN}/e/${slug} (${kind}) did not render; an SSR exception surfaces here as a 500`
		).toBe(200);

		// A 200 that rendered the error page would still be a broken entry, so
		// check something only the real page has: its own heading.
		await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15_000 });
	});
}

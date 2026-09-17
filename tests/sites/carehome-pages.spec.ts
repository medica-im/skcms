import { test, expect } from '@playwright/test';
import { originFor, requireSite } from './sites';

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
 *
 * The subjects are seeded, not discovered. This used to ask the API for any
 * live entry of each kind and `test.skip` when it found none — so on a database
 * without a care home the branch that broke was never visited, and the spec
 * reported a skip, which reads like a pass. Worse, when an entry did exist the
 * test measured whichever row the directory happened to contain that day.
 *
 * tests/fixtures/seed_care_homes.py plants one EHPAD and one USLD with fixed
 * slugs and non-zero bed counts. Missing data now fails naming the seed to run,
 * the same way requireSite fails naming the server to start.
 */

const SITE = 'annuaire.medica.im';
const ORIGIN = originFor(SITE);

// About one tenant in particular: fail naming the server to start, rather than
// measuring whatever else answers on this hostname.
test.beforeAll(async () => await requireSite(SITE));

/** The care home slugs that get their own component in e/[slug]/+page.ts. */
const CARE_HOME_SLUGS = ['ehpad', 'usld'] as const;

/** The slugs seed_care_homes.py gives its entries. */
const seededSlug = (kind: string) => `e2e-${kind}`;

/**
 * Whether the seeded entry for this kind is actually in the directory.
 *
 * Asked of the API rather than assumed, so a missing seed fails with the one
 * instruction that fixes it instead of a 404 the reader has to interpret.
 */
async function seededEntryExists(kind: string): Promise<boolean> {
	const response = await fetch(`${ORIGIN}/api/v2/entries`, {
		headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' }
	});
	expect(response.ok, `GET entries -> ${response.status}`).toBeTruthy();
	const entries = (await response.json()) as {
		entrySlug?: string;
		active?: boolean;
	}[];
	return entries.some((e) => e.active && e.entrySlug === seededSlug(kind));
}

for (const kind of CARE_HOME_SLUGS) {
	test(`a ${kind} entry page renders`, async ({ page }) => {
		// That the site is served at all is checked once in the beforeAll above,
		// not skipped past here: a skip is a test that did not run wearing the
		// colour of one that passed, and this spec skipped on every full run for
		// as long as only one site server was started.
		const slug = seededSlug(kind);

		// Not a skip: absent data is a fixture that has not been run, and a skip
		// wearing the colour of a pass is what hid this branch for so long.
		expect(
			await seededEntryExists(kind),
			`no active ${kind} entry "${slug}" on ${ORIGIN}.\n\n` +
				`The care home subjects are seeded, not discovered. Plant them with:\n` +
				`    cd ../backend && docker compose -f docker-compose-development.yml \\\n` +
				`      exec -T -e DIRECTORY=opale_sud django python manage.py shell \\\n` +
				`      < ../skcms/tests/fixtures/seed_care_homes.py\n`
		).toBeTruthy();

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

import { test as base } from 'playwright-bdd';
import { apiOrigin, siteBasePath } from '../tests/fixtures/session';

/**
 * Why browser waits in these step files are 8 seconds.
 *
 * Measured, not guessed. Over the steps of passing scenarios on 2026-09-15:
 *
 *   p50 = 0.12s   p90 = 2.76s   p99 = 2.83s   max = 2.86s
 *
 * Not one successful wait exceeded 5s, so 8s is roughly 3x the slowest thing
 * that has ever actually worked. The previous values -- 33 at 15s, 23 at 20s,
 * 11 at 30s -- were sized for the old 15GB box, where a starved chromium really
 * could take that long, and they cost twice on the current one:
 *
 *   * a FAILING step sat there for the full 20 or 30 seconds doing nothing, and
 *     with ~54 failures that was most of a 20-minute run spent waiting;
 *   * and they hid slowness. A wait that should return in 200ms and takes 12s
 *     is a bug, and at a 20s timeout it passes silently.
 *
 * Two kinds of timeout are deliberately NOT 8s, and must not be swept into it:
 *
 *   * `{ cwd: BACKEND_DIR, timeout: ... }` -- an execFile timeout for a
 *     `manage.py shell` in docker, which genuinely costs ~10s a call. Cutting
 *     those breaks every seeding step; they stay at 30-120s.
 *   * the 2s waits, which assert that something does NOT appear. A short wait
 *     is the point there, and raising it only makes the suite slower.
 *
 * If a legitimate wait starts landing near 8s, fix the wait before raising it.
 * ./scripts/slow-scenarios.sh reads the json reporter and shows the outliers.
 */

/**
 * The Playwright `test` every step file builds its steps from.
 *
 * It exists for one reason: **baseURL has to be decided per worker**, and
 * playwright.config.ts cannot do that. That file is evaluated once in the main
 * process, before any worker exists, so TEST_PARALLEL_INDEX is unset there and
 * reading it would hand every worker w0 — the shared dataset the worker sites
 * were built to get rid of, reintroduced silently.
 *
 * A worker-scoped fixture is evaluated inside each worker process instead,
 * where `workerInfo.parallelIndex` is its own index. `page.goto('/e/x')` then
 * resolves against that worker's own site, and so does every step that reads
 * `baseURL` from the fixtures.
 *
 * Worker-scoped rather than test-scoped so it is computed once per process
 * rather than once per scenario; the value cannot change within a worker.
 */
/**
 * Which worker SITE this test runs against.
 *
 * Not the same as playwright's parallelIndex. The suite runs every scenario
 * twice -- once against a site served at its root, once against one under a
 * base path -- as two projects over one pool of worker sites, whose lower half
 * is baseless and upper half prefixed (scripts/e2e-workers.sh). A project
 * declares which half it draws from with `workerOffset` in its `use`, and that
 * offset is added here.
 *
 * Without it both projects would address the same lower-half sites and the
 * base-path project would silently test the root shape twice -- passing, while
 * proving nothing, which is the failure mode this whole arrangement exists to
 * remove.
 */
function workerSlot(testInfo: import('@playwright/test').TestInfo): number {
	const use = testInfo.project.use as { workerOffset?: number; workerPoolSize?: number };
	const offset = Number(use.workerOffset ?? 0);
	const poolSize = Number(use.workerPoolSize ?? 0);

	// Wrapped into this project's OWN half of the pool, not just offset into it.
	// parallelIndex counts playwright's workers, which is PLAYWRIGHT_WORKERS and
	// has nothing to do with how many sites exist: at 8 playwright workers over
	// a 4-site half, `parallelIndex + offset` reached w8..w11, which do not
	// resolve. Every scenario on those slots died with ERR_NAME_NOT_RESOLVED,
	// and -- worse -- basePathForHost found no .env.test.w9 and reported no base
	// path, so the failures read as missing pages rather than a missing site.
	if (!poolSize) return testInfo.parallelIndex + offset;
	return offset + (testInfo.parallelIndex % poolSize);
}

/**
 * The base path the site under test is served under, for a step that needs it.
 *
 * Derived from `baseURL` -- the origin this test's own fixture resolved -- and
 * NOT from siteBasePath() with no argument. That form falls back to
 * TEST_PARALLEL_INDEX, which is the playwright worker slot and knows nothing
 * about a project's workerOffset: in chromium-base-path the slot is 0 while the
 * browser is on w4, so it reported '' and every prefixed URL assertion failed
 * against a pattern built for the root.
 */
export function basePathOf(baseURL: string | undefined): string {
	if (!baseURL) return '';
	const worker = new URL(baseURL).hostname.match(/^w(\d+)\./);
	return worker ? siteBasePath(Number(worker[1])) : siteBasePath();
}

export const test = base.extend<{ baseURL: string; page: import('@playwright/test').Page }>({
	// Test-scoped, and typed as a *fixture over the existing option* rather than
	// a worker fixture: `page` reads baseURL from the options layer, so a
	// worker-scoped fixture of the same name is simply not the value page.goto
	// resolves against — navigation fell back to Playwright's inferred
	// http://localhost:3000, or to undefined once that inference was removed.
	baseURL: async ({}, use, testInfo) => {
		const slot = workerSlot(testInfo);
		// Published into the environment as well as returned, because eleven step
		// files resolve their API origin at MODULE scope --
		// `const API_ORIGIN = apiOrigin()` -- where no fixture exists yet and the
		// project's workerOffset cannot be seen. Those files then fetched and
		// seeded against w0 while the browser drove w4, so a scenario looked for
		// data on a site where it had never been created. That single mismatch
		// accounts for most of the base-path failures on 15 Sep: the eleven files
		// are exactly avatar-access, avatar-crop-preview, entry-tag-categories,
		// facility-place-image, facility-rename, facility-deletion and the rest
		// of the list.
		//
		// Set before `use`, so it is in place before any step body runs. Module
		// initialisers still read whatever the first test set -- one worker
		// process only ever serves one slot, so that is this slot.
		process.env.TEST_PARALLEL_INDEX = String(slot);
		await use(apiOrigin(slot));
	},

	/**
	 * `page`, with the site's base path prepended to every relative navigation.
	 *
	 * It cannot be done through baseURL, which is where it belongs by rights:
	 * `new URL('/e/x', 'https://host/annuaire')` is 'https://host/e/x' — a
	 * leading slash resolves against the origin and throws the prefix away. The
	 * only baseURL that survives is one with a trailing slash paired with paths
	 * that have no leading slash, which would mean rewriting every step.
	 *
	 * So the prefix is applied here instead, once, and the thirty-odd steps that
	 * navigate keep writing `/e/${slug}`. '' for every site but unipa, which is
	 * served under /annuaire behind the WordPress that owns its root.
	 */
	page: async ({ page }, use, testInfo) => {
		const prefix = siteBasePath(workerSlot(testInfo));
		if (prefix) {
			const goto = page.goto.bind(page);
			page.goto = (url, options) =>
				goto(url.startsWith('/') && !url.startsWith(prefix) ? `${prefix}${url}` : url, options);
		}
		await use(page);
	}
});

export const expect = test.expect;

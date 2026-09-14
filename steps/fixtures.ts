import { test as base } from 'playwright-bdd';
import { apiOrigin, siteBasePath } from '../tests/fixtures/session';

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
export const test = base.extend<{ baseURL: string; page: import('@playwright/test').Page }>({
	// Test-scoped, and typed as a *fixture over the existing option* rather than
	// a worker fixture: `page` reads baseURL from the options layer, so a
	// worker-scoped fixture of the same name is simply not the value page.goto
	// resolves against — navigation fell back to Playwright's inferred
	// http://localhost:3000, or to undefined once that inference was removed.
	baseURL: async ({}, use, testInfo) => {
		await use(apiOrigin(testInfo.parallelIndex));
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
		const prefix = siteBasePath(testInfo.parallelIndex);
		if (prefix) {
			const goto = page.goto.bind(page);
			page.goto = (url, options) =>
				goto(url.startsWith('/') && !url.startsWith(prefix) ? `${prefix}${url}` : url, options);
		}
		await use(page);
	}
});

export const expect = test.expect;

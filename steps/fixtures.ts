import { test as base } from 'playwright-bdd';
import { apiOrigin } from '../tests/fixtures/session';

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
export const test = base.extend<{ baseURL: string }>({
	// Test-scoped, and typed as a *fixture over the existing option* rather than
	// a worker fixture: `page` reads baseURL from the options layer, so a
	// worker-scoped fixture of the same name is simply not the value page.goto
	// resolves against — navigation fell back to Playwright's inferred
	// http://localhost:3000, or to undefined once that inference was removed.
	baseURL: async ({}, use, testInfo) => {
		await use(apiOrigin(testInfo.parallelIndex));
	}
});

export const expect = test.expect;

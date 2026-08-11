import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';
import { apiOrigin } from './tests/fixtures/session';

// Generates Playwright specs from Gherkin .feature files + step definitions.
const testDir = defineBddConfig({
	features: 'features/**/*.feature',
	steps: 'steps/**/*.ts'
});

/**
 * Auth.js decides which session-cookie name/salt to use — both in SvelteKit's
 * own handler and independently in the backend's fastapi_nextauth_jwt — from
 * whether the request looks like https://. Browsing through localhost:3000
 * directly means Chromium only ever sees plain http, while the site is reached
 * over real TLS: the two disagree and no cookie can satisfy both. nginx
 * terminates TLS for the worker hostnames and forwards X-Forwarded-Proto (see
 * hooks.server.ts's trustForwardedProto), so routing the browser through nginx
 * makes the scheme agree end-to-end.
 *
 * **Per worker, not one origin for the run.** Each Playwright worker browses
 * its own wN.dev.medica.im, which the backend resolves to its own Site and
 * therefore its own dataset — see apiOrigin() in tests/fixtures/session.ts for
 * why sharing one was untenable.
 *
 * baseURL has to be a *fixture* rather than a plain value: this file is
 * evaluated once in the main process, where TEST_PARALLEL_INDEX does not exist
 * yet. Reading it here would give every worker w0. The fixture below is
 * evaluated inside each worker, where the index is set.
 */

export default defineConfig({
	testDir,
	// After hooks do not run when a run is interrupted, and what they leave
	// behind can make later scenarios pass while proving the opposite of their
	// name (see tests/globalSetup.ts).
	globalSetup: './tests/globalSetup.ts',
	// Some steps drive the backend through `manage.py shell` in Docker, which
	// costs ~10s per call, so the default 30s is too tight.
	timeout: 120_000,
	// No webServer: the suite needs one dev server *per worker*, each with its
	// own .env and its own site, which a single command cannot express. They are
	// started beforehand by
	//
	//     scripts/e2e-workers.sh start
	//
	// and nginx routes wN.dev.medica.im to the matching port. A webServer entry
	// here would additionally start a fifth Vite on :3000 that contends with
	// them over the shared pre-bundling cache in node_modules/.vite, and its
	// `port` form would silently override the per-worker baseURL besides.
	use: {
		// Worker 0's site, and the value the baseURL fixture in steps/fixtures.ts
		// shadows per worker. It has to be declared here all the same: the
		// fixture overrides an *option*, and an option absent from the config is
		// not one the `page` fixture resolves against.
		baseURL: apiOrigin(0),
		trace: 'on-first-retry'
	},
	projects: [
		{
			name: 'chromium',
			testDir,
			use: { ...devices['Desktop Chrome'] }
		},
		{
			// Plain Playwright specs, alongside the generated Gherkin ones. Some
			// behaviour is not a rule about the domain and reads badly as a
			// scenario — that a dropdown is drawn where a click can reach it is a
			// fact about a library's positioning, not something the business would
			// recognise. Those live here, sharing the suite's per-worker baseURL
			// and its globalSetup.
			//
			// testMatch is anchored to this directory so tests/sites/ below is not
			// swept in: those specs are about one site and would fail against a
			// worker serving another.
			name: 'specs',
			testDir: './tests',
			testMatch: /tests\/[^/]+\.spec\.ts$/,
			use: { ...devices['Desktop Chrome'] }
		},
		{
			// Specs about one site in particular.
			//
			// Most of the suite is site-agnostic, but this is a multi-tenant
			// codebase and some pages exist for a single tenant: the contact page
			// is in Lyon 3's skvar branch and sante-gadagne has no such route. A
			// spec here names its site and browses that site's origin, so it is
			// never measured against whichever worker happens to be running.
			//
			// Deliberately no baseURL: each spec resolves its own from
			// tests/sites/sites.ts, and inheriting the worker's would silently
			// point it at the wrong tenant.
			//
			//     pnpm exec playwright test --project=sites
			name: 'sites',
			testDir: './tests/sites',
			testMatch: '*.spec.ts',
			use: { ...devices['Desktop Chrome'] }
		}
	]
});

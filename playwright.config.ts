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
			use: { ...devices['Desktop Chrome'] }
		}
	]
});

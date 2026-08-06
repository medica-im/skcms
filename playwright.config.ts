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
 * directly means Chromium only ever sees plain http, while the backend at
 * PUBLIC_ORIGIN is reached over real TLS: the two disagree and no cookie can
 * satisfy both. nginx already terminates TLS for every dev.yml context on
 * this box and forwards X-Forwarded-Proto (see hooks.server.ts's
 * trustForwardedProto), so routing the browser through PUBLIC_ORIGIN instead
 * of straight to Vite makes the scheme agree end-to-end.
 */
const baseURL = apiOrigin();

export default defineConfig({
	testDir,
	// After hooks do not run when a run is interrupted, and what they leave
	// behind can make later scenarios pass while proving the opposite of their
	// name (see tests/globalSetup.ts).
	globalSetup: './tests/globalSetup.ts',
	// Some steps drive the backend through `manage.py shell` in Docker, which
	// costs ~10s per call, so the default 30s is too tight.
	timeout: 120_000,
	webServer: {
		// Run against the dev server for fast BDD-driven development.
		// Swap for `pnpm build && pnpm preview` (port 4173) for a prod-like run.
		// Only the readiness check needs the local port — the browser itself
		// goes through nginx (see baseURL above).
		command: 'pnpm dev',
		port: 3000,
		reuseExistingServer: true
	},
	use: {
		baseURL,
		trace: 'on-first-retry'
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}
	]
});

import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

// Generates Playwright specs from Gherkin .feature files + step definitions.
const testDir = defineBddConfig({
	features: 'features/**/*.feature',
	steps: 'steps/**/*.ts'
});

export default defineConfig({
	testDir,
	// Some steps drive the backend through `manage.py shell` in Docker, which
	// costs ~10s per call, so the default 30s is too tight.
	timeout: 120_000,
	webServer: {
		// Run against the dev server for fast BDD-driven development.
		// Swap for `pnpm build && pnpm preview` (port 4173) for a prod-like run.
		command: 'pnpm dev',
		port: 3000,
		reuseExistingServer: true
	},
	use: {
		baseURL: 'http://localhost:3000',
		trace: 'on-first-retry'
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}
	]
});

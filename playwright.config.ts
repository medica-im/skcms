import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

// Generates Playwright specs from Gherkin .feature files + step definitions.
const testDir = defineBddConfig({
	features: 'features/**/*.feature',
	steps: 'steps/**/*.ts'
});

export default defineConfig({
	testDir,
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

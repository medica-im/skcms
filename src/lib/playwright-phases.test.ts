import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * test-all.sh runs the Playwright suite in two phases: the worker projects with
 * only the worker servers up, then the `sites-*` projects with only the site
 * servers up.
 *
 * Run together, the site servers competed with eight worker Vites and their
 * browsers. On 2026-11-15 dev.annuaire.medica.im's server, alive and never
 * restarted, missed requireSite's 15s budget twice, and two annuaire specs
 * failed before testing anything.
 */

type Config = {
	outputDir?: string;
	reporter: [string, Record<string, string>?][];
	projects: { name: string }[];
};

async function configFor(phase: string | undefined): Promise<Config> {
	vi.resetModules();
	if (phase === undefined) vi.stubEnv('PLAYWRIGHT_PHASE', '');
	else vi.stubEnv('PLAYWRIGHT_PHASE', phase);
	return (await import('../../playwright.config')).default as unknown as Config;
}

const names = (config: Config) => config.projects.map((p) => p.name);
const isSites = (name: string) => name === 'sites' || name.startsWith('sites-');
const reporterOption = (config: Config, reporter: string, option: string) =>
	config.reporter.find(([name]) => name === reporter)?.[1]?.[option];

afterEach(() => {
	vi.unstubAllEnvs();
});

describe('the workers phase', () => {
	it('runs every project but the site ones', async () => {
		const projects = names(await configFor('workers'));

		expect(projects).toContain('chromium');
		expect(projects).toContain('firefox-cropper');
		expect(projects.filter(isSites)).toEqual([]);
	});

	it('writes where it always has', async () => {
		const config = await configFor('workers');

		expect(config.outputDir ?? 'test-results').toBe('test-results');
		expect(reporterOption(config, 'json', 'outputFile')).toBe('test-results/results.json');
		expect(reporterOption(config, 'html', 'outputFolder')).toBe('playwright-report');
	});
});

describe('the sites phase', () => {
	it('runs the site projects only', async () => {
		const projects = names(await configFor('sites'));

		expect(projects).toContain('sites-annuaire');
		expect(projects.filter((name) => !isSites(name))).toEqual([]);
	});

	it("leaves the workers phase's results, traces and report in place", async () => {
		// Playwright empties its outputDir and the html folder when a run starts.
		const config = await configFor('sites');

		expect(config.outputDir).toBe('test-results/sites');
		expect(reporterOption(config, 'json', 'outputFile')).toBe('test-results/sites/results.json');
		expect(reporterOption(config, 'html', 'outputFolder')).toBe('playwright-report/sites');
	});
});

describe('without a phase', () => {
	it('still runs everything, for a plain `playwright test`', async () => {
		const projects = names(await configFor(undefined));

		expect(projects).toContain('chromium');
		expect(projects).toContain('sites-annuaire');
	});
});

describe('warming the site servers', () => {
	const script = readFileSync(new URL('../../scripts/test-all.sh', import.meta.url), 'utf8');
	const start = script.indexOf('warm_site_servers() {');
	const warm = script.slice(start, script.indexOf('\n}\n', start));

	it('loads the routes the site specs visit, not only the root', () => {
		// A Vite dev server compiles a route on its first request, and a spec that finds the
		// server busy with that compile misses requireSite's 15s: on 2026-11-16 three annuaire
		// specs did, with the root warmed.
		for (const route of ['/sites', '/contact', '/e/', '/sites/']) {
			expect(warm, route).toContain(route);
		}
	});

	it('takes the entry and the facility from the same API the reload spec samples', () => {
		expect(warm).toContain('/api/v2/entries');
	});
});

describe('test-all.sh', () => {
	const script = readFileSync(new URL('../../scripts/test-all.sh', import.meta.url), 'utf8');
	const bdd = script.slice(
		script.indexOf('suite_bdd() {'),
		script.indexOf('\n}\n', script.indexOf('suite_bdd() {'))
	);

	it('starts the site servers only once the workers phase is over', () => {
		const workers = bdd.indexOf('PLAYWRIGHT_PHASE=workers');
		const siteServers = bdd.indexOf('ensure_all_site_servers');
		const sites = bdd.indexOf('PLAYWRIGHT_PHASE=sites');

		expect(workers).toBeGreaterThan(-1);
		expect(siteServers).toBeGreaterThan(workers);
		expect(sites).toBeGreaterThan(siteServers);
	});

	it('does not run the site specs on servers it could not set up', () => {
		// On 2026-11-17 a failed route check still ran all 173 site specs: 104 failed on a
		// 502 and 69 did not run, burying the one line that said what went wrong.
		const setup = bdd.indexOf('! ensure_all_site_servers');
		const sites = bdd.indexOf('PLAYWRIGHT_PHASE=sites');

		expect(setup).toBeGreaterThan(-1);
		expect(bdd.slice(setup, sites)).toMatch(/record "[^"]*setup[^"]*" fail/);
		expect(bdd.slice(setup, sites)).toContain('else');
	});

	it('checks the route to the site servers with site-test-route.sh', () => {
		const start = script.indexOf('ensure_all_site_servers() {');
		const ensure = script.slice(start, script.indexOf('\n}\n', start));

		expect(ensure).toContain('scripts/site-test-route.sh');
		expect(ensure).not.toMatch(/\|\s*grep -qi '\^x-dev-site-test/);
	});
});

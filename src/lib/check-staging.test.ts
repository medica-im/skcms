import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

/**
 * scripts/check-staging.sh: is staging working, now that new code is up?
 *
 * One command after a frontend or backend release, rather than monitors on
 * staging: what each host runs (versions.sh), our own broken links (muffet,
 * as the release always did) and every page loaded cold in a browser
 * (tests/staging), which is where a page that answers 200 and then dies on
 * hydration shows. release-staging.sh runs it on what it deployed.
 *
 * Only the choice of sites and the plan are checked here: the checks
 * themselves reach the staging machine.
 */

const SCRIPT = resolve(__dirname, '../../scripts/check-staging.sh');
const LIB = resolve(__dirname, '../../scripts/lib/staging-sites.sh');

function run(...args: string[]): { out: string; status: number } {
	try {
		return { out: execFileSync('bash', [SCRIPT, ...args], { encoding: 'utf8', stdio: 'pipe' }), status: 0 };
	} catch (e: unknown) {
		const err = e as { stdout?: string; stderr?: string; status?: number };
		return { out: (err.stdout ?? '') + (err.stderr ?? ''), status: err.status ?? 1 };
	}
}

const stagingNames = () =>
	execFileSync('bash', ['-c', `source "${LIB}" && staging_names`], { encoding: 'utf8' })
		.split('\n')
		.filter(Boolean);

describe('check-staging.sh', () => {
	it('checks every staging site when none is named', () => {
		const { out, status } = run('--list');
		expect(status).toBe(0);
		expect(out.trim().split('\n')).toEqual(stagingNames());
	});

	it('checks only the sites named', () => {
		const [first] = stagingNames();
		expect(run('--list', first).out.trim()).toBe(first);
	});

	it('refuses a production site', () => {
		const { out, status } = run('--list', 'santelyon3.fr');
		expect(status).not.toBe(0);
		expect(out).toMatch(/not a staging site/);
	});

	it('plans, for each site, what runs there, its links and its pages in a browser', () => {
		const [site] = stagingNames();
		const { out, status } = run('--dry-run', site);
		expect(status).toBe(0);
		expect(out).toMatch(/versions\.sh/);
		expect(out).toContain(`links: ${site}`);
		expect(out).toContain(`browser: ${site}`);
	});

	it('can leave out the links or the browser', () => {
		const [site] = stagingNames();
		expect(run('--dry-run', '--no-links', site).out).not.toContain(`links: ${site}`);
		expect(run('--dry-run', '--no-browser', site).out).not.toContain(`browser: ${site}`);
	});
});

import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, readlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

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
	return runWith({ TEE_LOG: '' }, ...args);
}

function runWith(env: Record<string, string>, ...args: string[]): { out: string; status: number } {
	try {
		const options = { encoding: 'utf8' as const, stdio: 'pipe' as const, env: { ...process.env, ...env } };
		return { out: execFileSync('bash', [SCRIPT, ...args], options), status: 0 };
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

/**
 * Every check is kept, as test-all's runs are: a post-release failure is read
 * hours later, and until now it lived in the terminal that ran it and nowhere
 * else. Colours stay on screen; the file has none, so a grep over it works.
 */
describe('check-staging.sh run log', () => {
	const logDir = () => mkdtempSync(join(tmpdir(), 'check-staging-logs-'));
	const logs = (dir: string) => readdirSync(dir).filter((f) => /^check-staging-2\d+-\d+\.log$/.test(f));

	it('writes each run to a dated file, and points -latest at it', () => {
		const [site] = stagingNames();
		const dir = logDir();
		const { status } = runWith({ CHECK_STAGING_LOG_DIR: dir }, '--dry-run', site);
		expect(status).toBe(0);
		expect(logs(dir)).toHaveLength(1);
		expect(readlinkSync(join(dir, 'check-staging-latest.log'))).toBe(logs(dir)[0]);
		expect(readFileSync(join(dir, logs(dir)[0]), 'utf8')).toContain(`browser: ${site}`);
	});

	it('writes nothing for --list, whose output is meant to be piped', () => {
		const dir = logDir();
		runWith({ CHECK_STAGING_LOG_DIR: dir }, '--list');
		expect(readdirSync(dir)).toEqual([]);
	});

	it('writes nothing when TEE_LOG is set empty', () => {
		const [site] = stagingNames();
		const dir = logDir();
		runWith({ CHECK_STAGING_LOG_DIR: dir, TEE_LOG: '' }, '--dry-run', site);
		expect(readdirSync(dir)).toEqual([]);
	});

	it('keeps the last 20 runs', () => {
		const [site] = stagingNames();
		const dir = logDir();
		for (let i = 0; i < 25; i++) writeFileSync(join(dir, `check-staging-2020010${i % 9}-0000${String(i).padStart(2, '0')}.log`), '');
		runWith({ CHECK_STAGING_LOG_DIR: dir }, '--dry-run', site);
		expect(logs(dir).length).toBeLessThanOrEqual(20);
	});
});

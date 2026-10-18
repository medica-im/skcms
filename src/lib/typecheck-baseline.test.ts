import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

/**
 * The svelte-check error budget each site is held to.
 *
 * The typecheck gate fails on the count rising above a baseline, one per site,
 * because each site checks out its own skvar branch and measures a different
 * count. The numbers live in scripts/typecheck-baselines.conf, committed: a
 * git-ignored copy drifts, and a baseline above the real count admits that many
 * new errors in silence. test-all.sh and the pre-push hook both ask
 * typecheck-baseline-of.sh, so they cannot disagree.
 */

const SCRIPT = resolve(__dirname, '../../scripts/typecheck-baseline-of.sh');
const CONF = resolve(__dirname, '../../scripts/typecheck-baselines.conf');
const REPO = resolve(__dirname, '../..');

let dir: string;
beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), 'tcbase-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

/** The environment without any baseline override the caller's shell may carry. */
function cleanEnv(extra: Record<string, string> = {}) {
	const env = Object.fromEntries(
		Object.entries(process.env).filter(([k]) => !k.startsWith('TYPECHECK_BASELINE'))
	);
	return { ...env, ...extra };
}

function baselineOf(site: string, conf: string, env: Record<string, string> = {}): string {
	const file = join(dir, 'baselines.conf');
	writeFileSync(file, conf);
	return execFileSync('bash', [SCRIPT, site], {
		encoding: 'utf8',
		stdio: 'pipe',
		env: cleanEnv({ TYPECHECK_BASELINES_FILE: file, ...env })
	}).trim();
}

const CONF_TEXT = ['TYPECHECK_BASELINE_lyon3=119', 'TYPECHECK_BASELINE_DEFAULT=125', ''].join('\n');

describe('typecheck-baseline-of.sh', () => {
	it("prints the site's own baseline", () => {
		expect(baselineOf('lyon3', CONF_TEXT)).toBe('119');
	});

	it('falls back to the default for a site with no line', () => {
		expect(baselineOf('newsite', CONF_TEXT)).toBe('125');
	});

	it('lets a per-site variable from the environment override the file', () => {
		expect(baselineOf('lyon3', CONF_TEXT, { TYPECHECK_BASELINE_lyon3: '90' })).toBe('90');
	});

	it('lets TYPECHECK_BASELINE override every site', () => {
		expect(baselineOf('lyon3', CONF_TEXT, { TYPECHECK_BASELINE: '7' })).toBe('7');
		expect(baselineOf('newsite', CONF_TEXT, { TYPECHECK_BASELINE: '7' })).toBe('7');
	});

	it('refuses a site name that is not a plain identifier', () => {
		expect(() => baselineOf('lyon3; rm -rf /', CONF_TEXT)).toThrow();
	});
});

/** The committed numbers, as bash reads them. */
function committedBaselines(): Record<string, number> {
	const out = execFileSync(
		'bash',
		['-c', 'source "$1"; for v in $(compgen -v TYPECHECK_BASELINE_); do echo "$v=${!v}"; done', '_', CONF],
		{ encoding: 'utf8', env: cleanEnv() }
	);
	return Object.fromEntries(
		out
			.trim()
			.split('\n')
			.map((line) => line.split('='))
			.map(([name, value]) => [name.replace('TYPECHECK_BASELINE_', ''), Number(value)])
	);
}

/** The sites dev.yml knows — the same list test-all.sh typechecks. */
function sites(): string[] {
	return execFileSync('yq', ['-r', '.contexts[].name', 'dev.yml'], { cwd: REPO, encoding: 'utf8' })
		.trim()
		.split('\n');
}

describe('scripts/typecheck-baselines.conf', () => {
	it('holds whole numbers only', () => {
		for (const [site, n] of Object.entries(committedBaselines())) {
			expect(Number.isInteger(n) && n >= 0, `${site}: ${n}`).toBe(true);
		}
	});

	// A site judged against the default is judged against the worst site's count:
	// vedene measured 117 and was let through up to 206.
	it('gives every site its own measured line', () => {
		const { DEFAULT: _, ...perSite } = committedBaselines();
		expect(Object.keys(perSite).sort()).toEqual(sites().sort());
	});

	it('sets the default to the highest site, so a new site inherits no stricter budget', () => {
		const { DEFAULT, ...perSite } = committedBaselines();
		expect(DEFAULT).toBe(Math.max(...Object.values(perSite)));
	});
});

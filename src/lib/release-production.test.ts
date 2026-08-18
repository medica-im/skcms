import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

/**
 * Which sites release-production.sh treats as production.
 *
 * Selection is by compose_file, not by name or host, because neither of those
 * separates the two sets: annuaire.medica.im is a production site that runs on
 * the *staging* machine and has no "production" anywhere in its name. A rule
 * about naming would have quietly left it out of every production release; a
 * rule about hosts would have swept in four staging sites alongside it.
 *
 * What actually distinguishes a production deployment is the compose file it
 * runs under, which is also what deploy-image.sh hands to docker compose.
 */

const SCRIPT = resolve(__dirname, '../../scripts/release-production.sh');

/**
 * The environment every run below gets.
 *
 * `process.env` already carries the sandbox: src/lib/test-sandbox.ts runs as a
 * setup file for the whole unit project and has put fakes for ssh, scp, rsync
 * and docker at the front of PATH, plus CLEAR_CACHE=0. Passing it through
 * explicitly is what hands that to the child `bash`, which is the process that
 * would otherwise reach a real machine.
 */
function sandboxEnv() {
	return { ...process.env };
}

function run(...args: string[]): { out: string; status: number } {
	try {
		return {
			out: execFileSync('bash', [SCRIPT, ...args], {
				encoding: 'utf8',
				env: sandboxEnv()
			}),
			status: 0
		};
	} catch (e: unknown) {
		const err = e as { stdout?: string; stderr?: string; status?: number };
		return { out: (err.stdout ?? '') + (err.stderr ?? ''), status: err.status ?? 1 };
	}
}

describe('release-production.sh', () => {
	it('lists every production site', () => {
		const { out, status } = run('--list');
		expect(status).toBe(0);
		const names = out.trim().split('\n').filter(Boolean);
		expect(names.sort()).toEqual(
			[
				'annuaire.cptsopalesud.fr',
				'annuaire.medica.im',
				'ipa.medica.im',
				'sante-gadagne.fr',
				'santelyon3.fr'
			].sort()
		);
	});

	it('includes the production site that runs on the staging machine', () => {
		// The whole reason selection is by compose file. Named separately so a
		// regression here fails with the reason attached.
		expect(run('--list').out).toContain('annuaire.medica.im');
	});

	it('excludes every staging site', () => {
		const names = run('--list').out.trim().split('\n');
		for (const n of names) {
			expect(n.startsWith('staging.'), `${n} is a staging site`).toBe(false);
		}
	});

	it('refuses a staging site by name', () => {
		// The mirror of release-staging.sh refusing production names: each script
		// releases one kind of thing, so the other kind is a mistake worth
		// stopping for rather than quietly obeying.
		const { out, status } = run('staging.santelyon3.fr', '--dry-run', '--yes');
		expect(status).not.toBe(0);
		expect(out).toMatch(/not a production site/i);
	});

	it('releases a single named site', () => {
		const { out, status } = run('santelyon3.fr', '--dry-run', '--yes');
		expect(status).toBe(0);
		expect(out).toContain('santelyon3.fr');
		expect(out).not.toContain('ipa.medica.im');
	});

	it('refuses a name that is not in the manifest', () => {
		const { out, status } = run('no-such-site', '--dry-run', '--yes');
		expect(status).not.toBe(0);
		expect(out).toMatch(/not a production site|no entry/i);
	});

	it('does not deploy anything on a dry run', () => {
		const { out } = run('--dry-run', '--yes');
		expect(out).toContain('dry run');
	});
});

/**
 * What happens to the rest of the run when one site fails.
 *
 * Staging carries on: one broken env file should not cost the other three, and
 * nobody is looking at those sites anyway. Production stops. A build or deploy
 * failing there is a reason to find out why before pushing the same change to
 * four more live sites — and continuing would bury the failure among later
 * output, so it is read after the damage rather than before.
 */
describe('release-production.sh when a site fails', () => {
	let dir: string;

	/** Stubs build-image.sh and deploy-image.sh so no image is ever built. */
	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), 'relprod-'));
	});
	afterEach(() => rmSync(dir, { recursive: true, force: true }));

	/**
	 * Runs the real script with the two it calls replaced. `failOn` names the
	 * site whose build should fail; every other call succeeds.
	 */
	function runWithStubs(failOn: string, ...args: string[]) {
		const scripts = resolve(__dirname, '../../scripts');
		const stubbed = join(dir, 'release-production.sh');
		const body = readFileSync(join(scripts, 'release-production.sh'), 'utf8')
			.replace(/^BUILD=.*$/m, `BUILD="${join(dir, 'build.sh')}"`)
			.replace(/^DEPLOY=.*$/m, `DEPLOY="${join(dir, 'deploy.sh')}"`);
		writeFileSync(stubbed, body, { mode: 0o755 });

		writeFileSync(
			join(dir, 'build.sh'),
			`#!/usr/bin/env bash\nfor a in "$@"; do [[ "$a" == "${failOn}" ]] && { echo "BUILD-FAIL $a"; exit 1; }; done\necho "BUILT $*"\n`,
			{ mode: 0o755 }
		);
		writeFileSync(join(dir, 'deploy.sh'), `#!/usr/bin/env bash\necho "DEPLOYED $*"\n`, {
			mode: 0o755
		});

		try {
			return {
				out: execFileSync('bash', [stubbed, ...args], {
					encoding: 'utf8',
					env: sandboxEnv()
				}),
				status: 0
			};
		} catch (e: unknown) {
			const err = e as { stdout?: string; stderr?: string; status?: number };
			return { out: (err.stdout ?? '') + (err.stderr ?? ''), status: err.status ?? 1 };
		}
	}

	it('stops at the first failure instead of carrying on', () => {
		// santelyon3.fr is second in images.yml, so the two sites after it must
		// never be touched.
		const { out, status } = runWithStubs('santelyon3.fr', '--yes');
		expect(status).not.toBe(0);
		expect(out).toContain('BUILD-FAIL santelyon3.fr');
		expect(out, 'a later site was built after a failure').not.toContain(
			'BUILT --keep-skvar sante-gadagne.fr'
		);
		expect(out, 'a later site was deployed after a failure').not.toContain(
			'DEPLOYED ipa.medica.im'
		);
	});

	it('does not deploy the site whose build failed', () => {
		const { out } = runWithStubs('santelyon3.fr', '--yes');
		expect(out).not.toContain('DEPLOYED santelyon3.fr');
	});

	it('names the sites it never attempted, apart from the one that failed', () => {
		// The distinction the summary exists for. "3 ok, 1 failed" reads like a
		// finished release with one casualty; what actually happened is a
		// release that stopped half way and left three live sites on the old
		// image. A site released, a site failed and a site never attempted are
		// three different states, and only the third tells you there is work
		// left to do.
		//
		// Asserted on the site names and their state rather than on the wording
		// around them: the previous test here matched /stopped|FAIL/i, which
		// passed on almost any output and was the one test that had to run a
		// site through to completion — the reason it reached old-staging over
		// ssh and timed out.
		const { out } = runWithStubs('santelyon3.fr', '--yes');
		expect(out).toMatch(/FAIL\s+santelyon3\.fr/);
		for (const later of ['sante-gadagne.fr', 'annuaire.cptsopalesud.fr', 'ipa.medica.im']) {
			expect(out, `${later} came after the failure and should be marked skipped`).toMatch(
				new RegExp(`SKIP\\s+${later.replace(/\./g, '\\.')}`)
			);
		}
	});

	it('releases everything when nothing fails', () => {
		const { out, status } = runWithStubs('none-of-them', '--yes');
		expect(status).toBe(0);
		expect(out).toContain('DEPLOYED ipa.medica.im');
	});

	it('never reaches a real host', () => {
		// The one that matters. This suite used to clear the Redis cache on
		// production and old-staging over ssh — five live connections for the
		// case where nothing fails, deleting cached payloads on sites that were
		// serving users, and leaving the run's duration at the mercy of the
		// network.
		//
		// Asserted on the sandbox's own refusal (src/lib/test-sandbox.ts prints
		// BLOCKED and exits 97) rather than on the absence of a side effect: a
		// test cannot prove it did not open a connection, but it can prove the
		// script never asked to.
		const { out } = runWithStubs('none-of-them', '--yes');
		expect(out, 'the suite tried to reach a real machine').not.toContain('BLOCKED:');
		// ...and it skipped the cache step by agreement rather than by being
		// blocked, which is what keeps the run quiet as well as safe.
		expect(out).toContain('cache: left alone');
	});
});

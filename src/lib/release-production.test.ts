import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

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

function run(...args: string[]): { out: string; status: number } {
	try {
		return {
			out: execFileSync('bash', [SCRIPT, ...args], { encoding: 'utf8' }),
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

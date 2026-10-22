import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

/**
 * scripts/lib/staging-sites.sh: which sites are staging, and where each is
 * served. Shared by release-staging.sh and check-staging.sh, so the two agree
 * on both -- a site released but left out of the check is the failure this
 * prevents.
 *
 * A site is staging by its compose file, not its name: annuaire.medica.im is a
 * production site on the staging machine and carries neither word.
 */

const LIB = resolve(__dirname, '../../scripts/lib/staging-sites.sh');

const IMAGES = `images:
  - name: staging.site.fr
    compose_file: docker-compose-staging.yml
  - name: site.fr
    compose_file: docker-compose-production.yml
  - name: annuaire.example.org
    compose_file: docker-compose-production.yml
  - name: staging.section.example.org
    origin: https://staging.example.org/annuaire
    compose_file: docker-compose-staging.yml
`;

let dir: string;

function lib(call: string): string {
	return execFileSync('bash', ['-c', `source "${LIB}" && ${call}`], {
		encoding: 'utf8',
		env: { ...process.env, IMAGES_FILE: join(dir, 'images.yml') }
	}).trim();
}

beforeAll(() => {
	dir = mkdtempSync(join(tmpdir(), 'staging-sites-'));
	writeFileSync(join(dir, 'images.yml'), IMAGES);
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('staging_names', () => {
	it('lists the sites deployed with the staging compose file, in images.yml order', () => {
		expect(lib('staging_names').split('\n')).toEqual(['staging.site.fr', 'staging.section.example.org']);
	});
});

describe('site_origin', () => {
	it('is the name as a host for a site served at its root', () => {
		expect(lib('site_origin staging.site.fr')).toBe('https://staging.site.fr');
	});

	it('is the origin images.yml gives for a site served elsewhere', () => {
		expect(lib('site_origin staging.section.example.org')).toBe('https://staging.example.org/annuaire');
	});
});

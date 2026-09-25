import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

/**
 * Whether a site may be indexed, declared in images.yml and enforced at build.
 *
 * VITE_NOINDEX is read through import.meta.env, so it is baked into the image,
 * and every dev and staging env file sets it to true. unipa.fr/annuaire went
 * live with <meta name="robots" content="noindex"> on every page and nothing
 * looked wrong. `target` cannot tell production from staging here — both
 * build the production target — so each entry says `indexable` outright and
 * scripts/check-indexable.sh refuses a build whose env file disagrees.
 *
 * The env files themselves are gitignored, so these tests feed the script
 * throwaway files rather than reading the real ones.
 */

const ROOT = resolve(__dirname, '../..');
const IMAGES = resolve(ROOT, 'images.yml');
const CHECK = resolve(ROOT, 'scripts/check-indexable.sh');

let dir: string;
beforeAll(() => {
	dir = mkdtempSync(join(tmpdir(), 'check-indexable-'));
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

let n = 0;
/** Run the check against an env file holding `body`. */
function check(body: string | null, indexable: string) {
	const file = join(dir, `.env.${n++}`);
	if (body !== null) writeFileSync(file, body);
	const r = spawnSync(CHECK, [file, indexable], { encoding: 'utf8' });
	return { ok: r.status === 0, stderr: r.stderr };
}

describe('images.yml', () => {
	it('declares indexable as a boolean on every entry', () => {
		// Required, not defaulted: a missing field is the check refusing, which
		// is better found by this test than by a release.
		const rows = execFileSync(
			'yq',
			['-r', '.images[] | .name + " " + (.indexable | tostring)', IMAGES],
			{ encoding: 'utf8' }
		)
			.split('\n')
			.filter(Boolean);
		expect(rows.length).toBeGreaterThan(0);
		for (const row of rows) expect(row).toMatch(/ (true|false)$/);
	});

	it('marks every staging-host entry not indexable', () => {
		const staging = execFileSync(
			'yq',
			['-r', '.images[] | select(.host == "staging") | .indexable', IMAGES],
			{ encoding: 'utf8' }
		)
			.split('\n')
			.filter(Boolean);
		expect(staging.length).toBeGreaterThan(0);
		expect(new Set(staging)).toEqual(new Set(['false']));
	});
});

describe('check-indexable.sh', () => {
	it('passes when the env file agrees', () => {
		expect(check('VITE_NOINDEX=false\n', 'true').ok).toBe(true);
		expect(check('VITE_NOINDEX=true\n', 'false').ok).toBe(true);
	});

	it('refuses a staging env file on an indexable entry', () => {
		// The unipa.fr/annuaire failure.
		const r = check('VITE_NOINDEX=true\n', 'true');
		expect(r.ok).toBe(false);
		expect(r.stderr).toContain('indexable');
	});

	it('refuses a production env file on a staging entry', () => {
		expect(check('VITE_NOINDEX=false\n', 'false').ok).toBe(false);
	});

	it('refuses a file that does not set the flag', () => {
		// The app would read this as indexable, which is wrong for staging.
		expect(check('PUBLIC_X=1\n', 'false').ok).toBe(false);
		expect(check('PUBLIC_X=1\n', 'true').ok).toBe(false);
	});

	it('refuses values the app would silently read as indexable', () => {
		for (const v of ['1', 'yes', 'TRUE', '']) {
			expect(check(`VITE_NOINDEX=${v}\n`, 'false').ok).toBe(false);
		}
	});

	it('refuses an entry without indexable, or a missing env file', () => {
		expect(check('VITE_NOINDEX=true\n', '').ok).toBe(false);
		expect(check('VITE_NOINDEX=true\n', 'null').ok).toBe(false);
		expect(check(null, 'true').ok).toBe(false);
	});

	it('reads the value the way dotenv does', () => {
		// Last assignment wins; quotes, export and a trailing comment are fine.
		expect(check('VITE_NOINDEX=true\nVITE_NOINDEX=false\n', 'true').ok).toBe(true);
		expect(check('VITE_NOINDEX="true"\n', 'false').ok).toBe(true);
		expect(check("export VITE_NOINDEX='false'\n", 'true').ok).toBe(true);
		expect(check('VITE_NOINDEX=true   # staging\n', 'false').ok).toBe(true);
		expect(check('# VITE_NOINDEX=false\nVITE_NOINDEX=true\n', 'false').ok).toBe(true);
		expect(check('VITE_NOINDEX=`false`\n', 'true').ok).toBe(true);
		expect(check('VITE_NOINDEX: false\n', 'true').ok).toBe(true);
		expect(check('VITE_NOINDEX=false#prod\r\n', 'true').ok).toBe(true);
	});

	it('sees every line Vite would take as the assignment', () => {
		// Vite accepts spaces around `=`. A parser that skipped this line would
		// check the `false` above it and pass a build that ships noindex.
		expect(check('VITE_NOINDEX=false\nVITE_NOINDEX = true\n', 'true').ok).toBe(false);
		expect(check('VITE_NOINDEX=false\nVITE_NOINDEX= "true"\n', 'true').ok).toBe(false);
	});
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

/**
 * Where the link check gets its muffet flags.
 *
 * They belong to the site, not to the script. Each .env.staging.<site> already
 * carries a LINKCHECK_FLAGS tuned for that site — a bigger read buffer for
 * lyon.fr's enormous response headers, excludes for doctolib and wikipedia,
 * and an openstreetmap exclude narrow enough to skip the map links while still
 * crawling the rest of the site. A second set hardcoded in the release script
 * would drift from those, and a link excluded in one place would surprise
 * somebody in the other.
 *
 * The env file is named by images.yml, so the script does not guess it.
 */

const SCRIPT = resolve(__dirname, '../../scripts/linkcheck-flags.sh');

let dir: string;
beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), 'lcflags-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

/** Writes an images.yml and the env files it points at, then resolves flags. */
function flagsFor(
	name: string,
	images: string,
	envFiles: Record<string, string> = {}
): { out: string; status: number } {
	writeFileSync(join(dir, 'images.yml'), images);
	for (const [file, body] of Object.entries(envFiles)) {
		writeFileSync(join(dir, file), body);
	}
	try {
		return {
			out: execFileSync('bash', [SCRIPT, name], {
				cwd: dir,
				env: { ...process.env, IMAGES_FILE: join(dir, 'images.yml') },
				encoding: 'utf8'
			}).trim(),
			status: 0
		};
	} catch (e: unknown) {
		const err = e as { stdout?: string; stderr?: string; status?: number };
		return { out: ((err.stdout ?? '') + (err.stderr ?? '')).trim(), status: err.status ?? 1 };
	}
}

const IMAGES = `
images:
  - name: staging.example.fr
    env_file: .env.staging.example.fr
`;

describe('resolving the link check flags', () => {
	it("uses the site's own LINKCHECK_FLAGS", () => {
		const { out } = flagsFor('staging.example.fr', IMAGES, {
			'.env.staging.example.fr': 'LINKCHECK_FLAGS="--timeout=20 --exclude=doctolib\\.fr"\n'
		});
		expect(out).toContain('--timeout=20');
		expect(out).toContain('doctolib');
	});

	it('keeps a value containing spaces and brackets intact', () => {
		// The real flags carry --exclude=[?&]origin= and a bracketed pattern; a
		// naive read would let the shell glob or split them.
		const { out } = flagsFor('staging.example.fr', IMAGES, {
			'.env.staging.example.fr':
				'LINKCHECK_FLAGS="--exclude=[?&]origin= --exclude=openstreetmap\\.org/.*#"\n'
		});
		expect(out).toContain('[?&]origin=');
		expect(out).toContain('openstreetmap');
	});

	it('falls back to a default when the site sets no flags', () => {
		// A site without the setting still gets a sane crawl rather than none.
		const { out, status } = flagsFor('staging.example.fr', IMAGES, {
			'.env.staging.example.fr': 'PUBLIC_ORIGIN="https://staging.example.fr"\n'
		});
		expect(status).toBe(0);
		expect(out).toContain('--format=json');
	});

	it('falls back when the env file is missing entirely', () => {
		const { out, status } = flagsFor('staging.example.fr', IMAGES);
		expect(status).toBe(0);
		expect(out).toContain('--format=json');
	});

	it('always asks for json, whatever the site configured', () => {
		// The classifier reads muffet's JSON. A site whose flags say --verbose
		// but not --format=json would otherwise produce text nothing can parse.
		const { out } = flagsFor('staging.example.fr', IMAGES, {
			'.env.staging.example.fr': 'LINKCHECK_FLAGS="--verbose --timeout=20"\n'
		});
		expect(out).toContain('--format=json');
		expect(out).toContain('--timeout=20');
	});

	it('does not fail when the image is unknown', () => {
		const { out, status } = flagsFor('staging.nope.fr', IMAGES);
		expect(status).toBe(0);
		expect(out).toContain('--format=json');
	});
});

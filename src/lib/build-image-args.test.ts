import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * build-image.sh's argument handling and its promise to put the submodule back.
 *
 * A build checks out the site's skvar_branch and pulls it, so running one left
 * the working tree on that branch — `git status` then reports "(new commits)"
 * against a tree nobody edited, and committing that pointer would change which
 * skvar the whole repository builds from.
 *
 * The restore is on by default, so a build run by hand is safe.
 * release-staging.sh passes --keep-skvar because it restores once at the end of
 * its loop instead of after every site.
 *
 * Only the parts that can be checked without building are checked here: a real
 * build pushes to ghcr. What is left over is the docker invocation itself.
 */

const SCRIPT = resolve(__dirname, '../../scripts/build-image.sh');
const source = readFileSync(SCRIPT, 'utf8');

/** Runs the script and returns stdout, whatever its exit status. */
function run(...args: string[]): { out: string; status: number } {
	try {
		return { out: execFileSync('bash', [SCRIPT, ...args], { encoding: 'utf8' }), status: 0 };
	} catch (e: unknown) {
		const err = e as { stdout?: string; stderr?: string; status?: number };
		return { out: (err.stdout ?? '') + (err.stderr ?? ''), status: err.status ?? 1 };
	}
}

describe('build-image.sh arguments', () => {
	it('still lists the image names', () => {
		// The flag must not disturb the existing interface: release-staging.sh
		// reads this list to decide what to build.
		const { out, status } = run('--list');
		expect(status).toBe(0);
		expect(out).toContain('staging.santelyon3.fr');
	});

	it('accepts --keep-skvar before or after the name', () => {
		// Rejected arguments would fail here with a usage error rather than
		// reaching the entry lookup.
		for (const args of [
			['--keep-skvar', 'no-such-image'],
			['no-such-image', '--keep-skvar']
		]) {
			const { out } = run(...args);
			expect(out, `args ${args.join(' ')} were not parsed`).toContain("no entry named 'no-such-image'");
		}
	});

	it('rejects an unknown flag rather than treating it as an image name', () => {
		const { out, status } = run('--nonsense');
		expect(status).not.toBe(0);
		expect(out).toMatch(/unknown option/i);
	});

	it('needs an image name', () => {
		const { status } = run();
		expect(status).not.toBe(0);
	});

	it('restores the submodule through the shared script, on the way out', () => {
		// Checked in the source rather than by building: the restore has its own
		// tests in skvar-restore.test.ts, and what matters here is that this
		// script calls it and does so from a trap, so an interrupted or failed
		// build cleans up too.
		expect(source).toMatch(/skvar-restore\.sh/);
		expect(source).toMatch(/trap\s+\w+\s+EXIT/);
	});

	it('records the commit to restore, not only the branch', () => {
		// The bug this replaces: a build pulls, so putting the branch name back
		// can still land on a newer commit than the parent repository records.
		expect(source).toMatch(/rev-parse HEAD/);
	});
});

/**
 * The app version SvelteKit stamps into the build.
 *
 * SvelteKit's client router holds the chunk filenames of the build it loaded.
 * A release replaces those files, so a tab opened before it navigates to a
 * chunk that is no longer there and the navigation dies — the page looks stuck
 * until the browser is emptied by hand. `version.name` is what lets the running
 * app notice: the client polls /_app/version.json and compares.
 *
 * The default is `Date.now()` evaluated when the config is read, which changes
 * on every dev server restart and differs between two builds of identical
 * code. The immutable image tag is the honest answer — it already names both
 * repositories, and it is what a rollback is addressed by.
 *
 * It has to be *passed in*: .dockerignore excludes .git, so the builder stage
 * cannot run image-tag.sh itself.
 */
describe('the app version stamped into the image', () => {
	const dockerfile = readFileSync(resolve(__dirname, '../../Dockerfile'), 'utf8');
	const config = readFileSync(resolve(__dirname, '../../svelte.config.js'), 'utf8');

	it('is sent to the builder stage as a build arg', () => {
		expect(source).toMatch(/--build-arg\s+APP_VERSION=/);
	});

	it('is the immutable image tag, so it names skcms and skvar both', () => {
		// Not a fresh timestamp and not skcms alone: a skvar-only change is a
		// different site and must produce a different version.
		expect(source).toMatch(/APP_VERSION="?\$\{?IMMUTABLE_TAG/);
	});

	it('reaches the stage that runs the build, not only the runtime stage', () => {
		// GIT_SHA and SUBMODULE_SHA are declared in the production stage, where
		// they become labels. This one is read by svelte.config.js during
		// `pnpm run -r build`, so it must be declared in the builder.
		const builder = dockerfile.slice(
			dockerfile.indexOf('AS builder'),
			dockerfile.indexOf('AS production')
		);
		expect(builder).toMatch(/ARG APP_VERSION/);
		expect(builder).toMatch(/ENV APP_VERSION/);
	});

	it('is what svelte.config.js names the version', () => {
		expect(config).toMatch(/version:\s*\{[^}]*name:/);
		expect(config).toMatch(/APP_VERSION/);
	});
});

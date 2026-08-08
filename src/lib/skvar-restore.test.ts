import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

/**
 * Putting the skvar submodule back after a release.
 *
 * build-image.sh checks out each site's skvar_branch *and pulls it*, so a loop
 * over several sites leaves the submodule somewhere else entirely — once, on
 * another site's production branch, where committing the pointer would have
 * made that the default for the whole repository.
 *
 * Restoring the branch name is not enough, which is the bug these pin:
 *
 *   * a pull can advance the branch, so checking the same branch out again
 *     lands on a newer commit than the parent recorded and `git status` still
 *     reports "(new commits)";
 *   * a release started on the same branch a build then pulled looks unchanged
 *     by name while sitting on a different commit.
 *
 * So the commit is what gets restored, and the branch put back on top of it.
 */

const SCRIPT = resolve(__dirname, '../../scripts/skvar-restore.sh');

let dir: string;
const git = (cwd: string, ...args: string[]) =>
	execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();

/** A repository standing in for the submodule, with two branches. */
beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), 'skvar-'));
	git(dir, 'init', '-q', '-b', 'dev.site');
	git(dir, 'config', 'user.email', 't@t.test');
	git(dir, 'config', 'user.name', 'test');
	writeFileSync(join(dir, 'a'), '1');
	git(dir, 'add', '.');
	git(dir, 'commit', '-qm', 'one');
});

afterEach(() => rmSync(dir, { recursive: true, force: true }));

/** Runs the restore against the fake submodule. */
const restore = (sha: string, branch: string) =>
	execFileSync('bash', [SCRIPT, dir, sha, branch], { encoding: 'utf8' });

describe('restoring the skvar submodule', () => {
	it('brings back the recorded commit after a build moved the branch', () => {
		const recorded = git(dir, 'rev-parse', 'HEAD');

		// What a build does: check out another branch and advance it.
		git(dir, 'checkout', '-qb', 'production.other');
		writeFileSync(join(dir, 'b'), '2');
		git(dir, 'add', '.');
		git(dir, 'commit', '-qm', 'another site');
		expect(git(dir, 'rev-parse', 'HEAD')).not.toBe(recorded);

		restore(recorded, 'dev.site');

		expect(git(dir, 'rev-parse', 'HEAD')).toBe(recorded);
		expect(git(dir, 'symbolic-ref', '--short', 'HEAD')).toBe('dev.site');
	});

	it('restores the commit even when the branch name never changed', () => {
		// The case the previous version returned early on: same branch, moved on.
		// A pull during the release advances the very branch the release started
		// from, so nothing looks wrong by name.
		const recorded = git(dir, 'rev-parse', 'HEAD');
		writeFileSync(join(dir, 'c'), '3');
		git(dir, 'add', '.');
		git(dir, 'commit', '-qm', 'pulled during the release');
		expect(git(dir, 'rev-parse', 'HEAD')).not.toBe(recorded);

		restore(recorded, 'dev.site');

		expect(git(dir, 'rev-parse', 'HEAD')).toBe(recorded);
	});

	it('leaves an already-correct submodule alone', () => {
		const recorded = git(dir, 'rev-parse', 'HEAD');
		restore(recorded, 'dev.site');
		expect(git(dir, 'rev-parse', 'HEAD')).toBe(recorded);
		expect(git(dir, 'symbolic-ref', '--short', 'HEAD')).toBe('dev.site');
	});

	it('restores the commit even when it cannot restore the branch', () => {
		// A detached start, or a branch deleted mid-release: the commit is what
		// the parent repository records, so it matters more than the branch.
		const recorded = git(dir, 'rev-parse', 'HEAD');
		git(dir, 'checkout', '-qb', 'production.other');
		writeFileSync(join(dir, 'd'), '4');
		git(dir, 'add', '.');
		git(dir, 'commit', '-qm', 'elsewhere');

		restore(recorded, '');

		expect(git(dir, 'rev-parse', 'HEAD')).toBe(recorded);
	});
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { skvarSource } from './skvarSource';

/**
 * Which version of a tenant's skvar file an skcms test reads.
 *
 * A test that checks one tenant's page from skcms (santelyon3-contact-load)
 * runs on every checkout, so it cannot import the page from wherever the
 * submodule happens to sit. Reading the committed branch instead is right on
 * a developer's other checkouts, but wrong inside test-all: there the code
 * under test is the snapshot, uncommitted edits included, and the branch ref
 * does not have them. A change to that page would then pass every stage but
 * the one tenant's.
 */

let dir: string;
let sub: string;

/** Git with no global or system config: no signing, no hooks, a fixed identity. */
const gitEnv = {
	...process.env,
	GIT_CONFIG_GLOBAL: '/dev/null',
	GIT_CONFIG_NOSYSTEM: '1',
	GIT_AUTHOR_NAME: 'Test',
	GIT_AUTHOR_EMAIL: 'test@example.org',
	GIT_COMMITTER_NAME: 'Test',
	GIT_COMMITTER_EMAIL: 'test@example.org'
};
const git = (...args: string[]) =>
	execFileSync('git', args, { cwd: sub, encoding: 'utf8', env: gitEnv, stdio: 'pipe' }).trim();
const write = (path: string, text: string) => {
	mkdirSync(join(sub, path, '..'), { recursive: true });
	writeFileSync(join(sub, path), text);
};

const PAGE = 'contact/+page.server.ts';
/** No test-all run in progress, whatever the environment running this suite. */
const noRun = { TEST_ALL_SKVAR_BRANCH: undefined, TEST_ALL_SKVAR_SNAPSHOT: undefined };
const read = (env: Record<string, string | undefined> = noRun) =>
	skvarSource('lyon', PAGE, { submodule: sub, env });

beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), 'skvar-source-'));
	sub = join(dir, 'skvar');
	mkdirSync(sub);
	git('init', '-q', '-b', 'lyon');
	write(PAGE, 'committed');
	git('add', '.');
	git('commit', '-q', '-m', 'lyon');
	git('checkout', '-q', '--orphan', 'other');
	git('rm', '-q', '-r', '--cached', '.');
	rmSync(join(sub, 'contact'), { recursive: true });
	write('home.ts', 'other tenant');
	git('add', '.');
	git('commit', '-q', '-m', 'other');
});

afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('reading a tenant file from skcms', () => {
	it('reads the committed branch from another tenant’s checkout', () => {
		expect(read().source).toBe('committed');
	});

	it('reads the working tree, uncommitted edits included, when that branch is checked out', () => {
		git('checkout', '-q', 'lyon');
		write(PAGE, 'edited');
		const file = read();
		expect(file.source).toBe('edited');
		expect(file.workingTreeFile).toBe(join(sub, PAGE));
	});

	it('never reads another branch’s file of the same name', () => {
		write(PAGE, 'the other tenant’s own contact page');
		git('add', '.');
		git('commit', '-q', '-m', 'other contact');
		const file = read();
		expect(file.source).toBe('committed');
		expect(file.workingTreeFile).toBeUndefined();
	});

	describe('inside a test-all run', () => {
		/** A snapshot commit of `lyon` with an edit the branch does not have. */
		function snapshotOfLyon(text: string) {
			git('checkout', '-q', 'lyon');
			write(PAGE, text);
			git('commit', '-q', '-am', 'snapshot');
			const snapshot = git('rev-parse', 'HEAD');
			git('reset', '-q', '--hard', 'HEAD~1');
			git('checkout', '-q', '--detach', 'other');
			return snapshot;
		}

		it('reads the snapshot when it was taken on that branch, from any checkout', () => {
			const snapshot = snapshotOfLyon('snapshot edit');
			const file = read({ TEST_ALL_SKVAR_BRANCH: 'lyon', TEST_ALL_SKVAR_SNAPSHOT: snapshot });
			expect(file.source).toBe('snapshot edit');
		});

		it('reads the branch when the snapshot was taken on another one', () => {
			const snapshot = snapshotOfLyon('snapshot edit');
			const file = read({ TEST_ALL_SKVAR_BRANCH: 'other', TEST_ALL_SKVAR_SNAPSHOT: snapshot });
			expect(file.source).toBe('committed');
		});
	});

	it('names the branch and the file when neither has it', () => {
		expect(() => skvarSource('lyon', 'nowhere.ts', { submodule: sub, env: noRun })).toThrow(
			/nowhere\.ts.*lyon/
		);
	});
});

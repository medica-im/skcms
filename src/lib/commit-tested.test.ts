import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

/**
 * Committing what a test-all run tested, not what the tree holds by now.
 *
 * test-all runs on a snapshot of the working tree (refs/test-all/last), so the
 * developer can go on editing while it runs; a green run is recorded as
 * refs/test-all/passed. This script commits the snapshot's contents — all of
 * it, or a theme at a time by path — from the snapshot itself, through the
 * index only: the files on disk, newer edits included, are never touched, and
 * after the last theme HEAD's tree is the tested tree.
 *
 * It refuses whatever would make "tested" untrue: no green run, a latest run
 * that did not pass, a partial run, something already staged, or a HEAD that
 * has gained changes the run never saw. skvar's pointer is never committed: the
 * snapshot's points at an unsigned scaffold commit.
 */

const SNAPSHOT = resolve(__dirname, '../../scripts/snapshot-tree.sh');
const SCRIPT = resolve(__dirname, '../../scripts/commit-tested.sh');

let dir: string;
let main: string;

const env = () => ({
	...process.env,
	GIT_CONFIG_GLOBAL: '/dev/null',
	GIT_CONFIG_NOSYSTEM: '1',
	GIT_AUTHOR_NAME: 'Test',
	GIT_AUTHOR_EMAIL: 'test@example.org',
	GIT_COMMITTER_NAME: 'Test',
	GIT_COMMITTER_EMAIL: 'test@example.org',
	SKVAR_PATH: 'sub'
});
const git = (cwd: string, ...args: string[]) =>
	execFileSync('git', args, { cwd, encoding: 'utf8', env: env(), stdio: 'pipe' }).trim();
const write = (path: string, text: string) => writeFileSync(path, text);
const read = (path: string) => readFileSync(path, 'utf8');

/** What test-all does: snapshot at the start, and record a green end. */
function testAllRun({ passes = true, note = 'full' } = {}) {
	const out = execFileSync('bash', [SNAPSHOT], { cwd: main, encoding: 'utf8', env: env(), stdio: 'pipe' });
	const s = Object.fromEntries(out.trim().split('\n').map((l) => l.split('=') as [string, string]));
	git(main, 'update-ref', 'refs/test-all/last', s.SNAPSHOT);
	if (passes) {
		git(main, 'update-ref', '--create-reflog', '-m', `test-all passed (${note})`, 'refs/test-all/passed', s.SNAPSHOT);
	}
	return s;
}

/** Runs the script; returns its output, or throws with it. */
function commitTested(...args: string[]): string {
	try {
		return execFileSync('bash', [SCRIPT, ...args], { cwd: main, encoding: 'utf8', env: env(), stdio: 'pipe' });
	} catch (e) {
		const err = e as { stdout?: string; stderr?: string };
		throw new Error(`${err.stdout ?? ''}${err.stderr ?? ''}`);
	}
}
const tree = (rev: string) => git(main, 'rev-parse', `${rev}^{tree}`);
const filesOf = (rev: string) => git(main, 'ls-tree', '-r', '--name-only', rev).split('\n');

beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), 'commit-tested-'));
	const sub = join(dir, 'sub-origin');
	main = join(dir, 'main');
	mkdirSync(sub);
	git(sub, 'init', '-q', '-b', 'site.fr');
	write(join(sub, 'page.svelte'), 'committed page\n');
	git(sub, 'add', '-A');
	git(sub, 'commit', '-q', '-m', 'page');

	mkdirSync(main);
	git(main, 'init', '-q', '-b', 'main');
	write(join(main, 'a.ts'), 'a committed\n');
	write(join(main, 'b.ts'), 'b committed\n');
	write(join(main, 'gone.ts'), 'deleted later\n');
	git(main, 'add', '-A');
	git(main, '-c', 'protocol.file.allow=always', 'submodule', 'add', '-q', '-b', 'site.fr', sub, 'sub');
	git(main, 'commit', '-q', '-m', 'base');
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('commit-tested.sh', () => {
	it('commits exactly what was tested, and leaves later edits on disk, unstaged', () => {
		write(join(main, 'a.ts'), 'a tested\n');
		write(join(main, 'new.ts'), 'new tested\n');
		unlinkSync(join(main, 'gone.ts'));
		const s = testAllRun();
		write(join(main, 'a.ts'), 'a edited after the run\n');
		write(join(main, 'b.ts'), 'b edited after the run\n');
		const before = git(main, 'rev-parse', 'HEAD');

		const out = commitTested('-m', 'Tested change');

		expect(git(main, 'rev-parse', 'HEAD^')).toBe(before);
		expect(git(main, 'log', '-1', '--format=%s')).toBe('Tested change');
		expect(git(main, 'show', 'HEAD:a.ts')).toBe('a tested');
		expect(git(main, 'show', 'HEAD:new.ts')).toBe('new tested');
		expect(filesOf('HEAD')).not.toContain('gone.ts');
		expect(tree('HEAD')).toBe(tree(s.SNAPSHOT));
		expect(out).toMatch(/exactly what was tested/);
		// The files on disk are the developer's, untouched; the index is HEAD.
		expect(read(join(main, 'a.ts'))).toBe('a edited after the run\n');
		expect(read(join(main, 'b.ts'))).toBe('b edited after the run\n');
		expect(git(main, 'diff', '--cached', '--name-only')).toBe('');
		expect(git(main, 'diff', '--name-only').split('\n').sort()).toEqual(['a.ts', 'b.ts']);
	});

	it('commits a theme at a time by path, then the rest', () => {
		write(join(main, 'a.ts'), 'a tested\n');
		write(join(main, 'b.ts'), 'b tested\n');
		const s = testAllRun();

		const first = commitTested('-m', 'Theme A', '--', 'a.ts');
		expect(git(main, 'show', 'HEAD:a.ts')).toBe('a tested');
		expect(git(main, 'show', 'HEAD:b.ts')).toBe('b committed');
		expect(first).toMatch(/b\.ts/);

		commitTested('-m', 'Theme B');
		expect(git(main, 'log', '--format=%s', '-2').split('\n')).toEqual(['Theme B', 'Theme A']);
		expect(tree('HEAD')).toBe(tree(s.SNAPSHOT));
	});

	it('shows what it would commit with --dry-run, and commits nothing', () => {
		write(join(main, 'a.ts'), 'a tested\n');
		testAllRun();
		const before = git(main, 'rev-parse', 'HEAD');
		expect(commitTested('--dry-run')).toMatch(/a\.ts/);
		expect(git(main, 'rev-parse', 'HEAD')).toBe(before);
	});

	it('refuses without a green run', () => {
		write(join(main, 'a.ts'), 'a untested\n');
		expect(() => commitTested('-m', 'x')).toThrow(/no green test-all run/);
	});

	it('refuses when the latest run did not pass', () => {
		write(join(main, 'a.ts'), 'a tested\n');
		testAllRun();
		write(join(main, 'a.ts'), 'a failed\n');
		testAllRun({ passes: false });
		expect(() => commitTested('-m', 'x')).toThrow(/latest test-all run .* did not pass/);
	});

	it('refuses a partial run unless told to accept it', () => {
		write(join(main, 'a.ts'), 'a tested\n');
		testAllRun({ note: 'partial: unit on lyon3' });
		expect(() => commitTested('-m', 'x')).toThrow(/partial: unit on lyon3/);
		commitTested('--allow-partial', '-m', 'x');
		expect(git(main, 'show', 'HEAD:a.ts')).toBe('a tested');
	});

	it('refuses while something is staged', () => {
		write(join(main, 'a.ts'), 'a tested\n');
		testAllRun();
		write(join(main, 'b.ts'), 'b staged\n');
		git(main, 'add', 'b.ts');
		expect(() => commitTested('-m', 'x')).toThrow(/staged/);
	});

	it('refuses when HEAD has gained a change the run never saw', () => {
		write(join(main, 'a.ts'), 'a tested\n');
		testAllRun();
		write(join(main, 'b.ts'), 'b untested\n');
		git(main, 'commit', '-q', '-m', 'outside', '--', 'b.ts');
		expect(() => commitTested('-m', 'x')).toThrow(/b\.ts/);
	});

	it("never commits skvar's pointer, and says skvar's tested edits are its own to commit", () => {
		write(join(main, 'a.ts'), 'a tested\n');
		write(join(main, 'sub', 'page.svelte'), 'page tested\n');
		testAllRun();
		const pointer = git(main, 'rev-parse', 'HEAD:sub');
		const out = commitTested('-m', 'x');
		expect(git(main, 'rev-parse', 'HEAD:sub')).toBe(pointer);
		expect(out).toMatch(/skvar/i);
	});

	it('says so when the tested state is already committed', () => {
		write(join(main, 'a.ts'), 'a tested\n');
		testAllRun();
		commitTested('-m', 'x');
		expect(commitTested('-m', 'again')).toMatch(/already committed/);
	});
});

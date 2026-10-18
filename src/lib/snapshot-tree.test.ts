import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

/**
 * The code a test-all run tests: the working tree as it was when the run began.
 *
 * test-all runs on a snapshot so the working tree is free for other work while
 * it runs, and so a green run can be committed exactly — not whatever the tree
 * holds by the time the run ends. The snapshot is a commit object on top of
 * HEAD, made through a scratch index: the developer's index, files and
 * branches are never touched. skvar, a submodule with uncommitted edits of its
 * own, is snapshotted the same way and the parent's gitlink points at it.
 */

const SCRIPT = resolve(__dirname, '../../scripts/snapshot-tree.sh');

let dir: string;
let main: string;
let sub: string;

/** Git with no global or system config: no signing, no hooks, a fixed identity. */
const env = () => ({
	...process.env,
	GIT_CONFIG_GLOBAL: '/dev/null',
	GIT_CONFIG_NOSYSTEM: '1',
	GIT_AUTHOR_NAME: 'Test',
	GIT_AUTHOR_EMAIL: 'test@example.org',
	GIT_COMMITTER_NAME: 'Test',
	GIT_COMMITTER_EMAIL: 'test@example.org'
});
const git = (cwd: string, ...args: string[]) =>
	execFileSync('git', args, { cwd, encoding: 'utf8', env: env(), stdio: 'pipe' }).trim();
const write = (path: string, text: string) => writeFileSync(path, text);

/** Runs the script in `main` and returns its NAME=value lines as an object. */
function snapshot(): Record<string, string> {
	const out = execFileSync('bash', [SCRIPT], {
		cwd: main,
		encoding: 'utf8',
		env: { ...env(), SKVAR_PATH: 'sub' },
		stdio: 'pipe'
	});
	return Object.fromEntries(
		out
			.trim()
			.split('\n')
			.map((line) => line.split('=') as [string, string])
	);
}
const show = (cwd: string, rev: string, path: string) => git(cwd, 'show', `${rev}:${path}`);
const state = (cwd: string) => ({
	head: git(cwd, 'rev-parse', 'HEAD'),
	status: git(cwd, 'status', '--porcelain=v1', '--ignore-submodules=none'),
	staged: git(cwd, 'diff', '--cached')
});

beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), 'snapshot-'));
	sub = join(dir, 'sub-origin');
	main = join(dir, 'main');
	mkdirSync(sub);
	git(sub, 'init', '-q', '-b', 'site.fr');
	write(join(sub, 'page.svelte'), 'committed page\n');
	git(sub, 'add', '-A');
	git(sub, 'commit', '-q', '-m', 'page');

	mkdirSync(main);
	git(main, 'init', '-q', '-b', 'main');
	write(join(main, 'app.ts'), 'committed app\n');
	write(join(main, 'gone.ts'), 'to be deleted\n');
	write(join(main, '.gitignore'), 'ignored.txt\n');
	git(main, 'add', '-A');
	git(main, '-c', 'protocol.file.allow=always', 'submodule', 'add', '-q', '-b', 'site.fr', sub, 'sub');
	git(main, 'commit', '-q', '-m', 'base');
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('snapshot-tree.sh', () => {
	it('is HEAD itself when nothing has changed', () => {
		const s = snapshot();
		expect(s.SNAPSHOT).toBe(git(main, 'rev-parse', 'HEAD'));
		expect(s.SKVAR_SNAPSHOT).toBe(git(join(main, 'sub'), 'rev-parse', 'HEAD'));
	});

	it('holds modified, new and deleted files, on top of HEAD', () => {
		write(join(main, 'app.ts'), 'edited app\n');
		write(join(main, 'new.test.ts'), 'a test not yet added\n');
		unlinkSync(join(main, 'gone.ts'));
		const s = snapshot();
		expect(git(main, 'rev-parse', `${s.SNAPSHOT}^`)).toBe(git(main, 'rev-parse', 'HEAD'));
		expect(show(main, s.SNAPSHOT, 'app.ts')).toBe('edited app');
		expect(show(main, s.SNAPSHOT, 'new.test.ts')).toBe('a test not yet added');
		expect(() => show(main, s.SNAPSHOT, 'gone.ts')).toThrow();
	});

	it("takes the working tree's version over a staged one", () => {
		write(join(main, 'app.ts'), 'staged app\n');
		git(main, 'add', 'app.ts');
		write(join(main, 'app.ts'), 'working app\n');
		expect(show(main, snapshot().SNAPSHOT, 'app.ts')).toBe('working app');
	});

	it('leaves out ignored files', () => {
		write(join(main, 'ignored.txt'), 'secret\n');
		write(join(main, 'app.ts'), 'edited app\n');
		expect(() => show(main, snapshot().SNAPSHOT, 'ignored.txt')).toThrow();
	});

	it("touches neither the index, the files nor HEAD", () => {
		write(join(main, 'app.ts'), 'staged app\n');
		git(main, 'add', 'app.ts');
		write(join(main, 'app.ts'), 'working app\n');
		write(join(main, 'new.test.ts'), 'untracked\n');
		write(join(main, 'sub', 'page.svelte'), 'edited page\n');
		const before = { main: state(main), sub: state(join(main, 'sub')) };
		snapshot();
		expect({ main: state(main), sub: state(join(main, 'sub')) }).toEqual(before);
	});

	it("holds skvar's uncommitted edits, and points the parent at them", () => {
		write(join(main, 'sub', 'page.svelte'), 'edited page\n');
		write(join(main, 'sub', 'new.svelte'), 'new page\n');
		const s = snapshot();
		const subDir = join(main, 'sub');
		expect(git(subDir, 'rev-parse', `${s.SKVAR_SNAPSHOT}^`)).toBe(git(subDir, 'rev-parse', 'HEAD'));
		expect(show(subDir, s.SKVAR_SNAPSHOT, 'page.svelte')).toBe('edited page');
		expect(show(subDir, s.SKVAR_SNAPSHOT, 'new.svelte')).toBe('new page');
		expect(git(main, 'rev-parse', `${s.SNAPSHOT}:sub`)).toBe(s.SKVAR_SNAPSHOT);
	});

	it('names the skvar branch the snapshot was taken on', () => {
		expect(snapshot().SKVAR_BRANCH).toBe('site.fr');
	});
});

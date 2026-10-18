import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import {
	existsSync,
	lstatSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	readlinkSync,
	rmSync,
	unlinkSync,
	writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

/**
 * Where a test-all run runs: a worktree beside the checkout, at a snapshot.
 *
 * The worktree is the snapshot's files, skvar included at its own snapshot, so
 * the run can switch branches, rewrite generated files and start servers
 * without touching the checkout being worked in. Git leaves out the ignored
 * inputs the run needs — dev.yml, the site env files — so those are linked,
 * not copied: no second copy of a secret, nothing to drift. The worktree's own
 * `.env` and the files the run generates are its own.
 */

const SNAPSHOT_SCRIPT = resolve(__dirname, '../../scripts/snapshot-tree.sh');
const SCRIPT = resolve(__dirname, '../../scripts/test-worktree.sh');

let dir: string;
let main: string;
let wt: string;

const env = () => ({
	...process.env,
	GIT_CONFIG_GLOBAL: '/dev/null',
	GIT_CONFIG_NOSYSTEM: '1',
	GIT_AUTHOR_NAME: 'Test',
	GIT_AUTHOR_EMAIL: 'test@example.org',
	GIT_COMMITTER_NAME: 'Test',
	GIT_COMMITTER_EMAIL: 'test@example.org',
	SKVAR_PATH: 'sub',
	TEST_WORKTREE_INSTALL: '0'
});
const git = (cwd: string, ...args: string[]) =>
	execFileSync('git', args, { cwd, encoding: 'utf8', env: env(), stdio: 'pipe' }).trim();
const write = (path: string, text: string) => writeFileSync(path, text);
const read = (path: string) => readFileSync(path, 'utf8');

function snapshot(): Record<string, string> {
	const out = execFileSync('bash', [SNAPSHOT_SCRIPT], { cwd: main, encoding: 'utf8', env: env(), stdio: 'pipe' });
	return Object.fromEntries(out.trim().split('\n').map((l) => l.split('=') as [string, string]));
}
/** Snapshots `main` and brings the worktree to it. */
function prepare() {
	const s = snapshot();
	execFileSync('bash', [SCRIPT, wt, s.SNAPSHOT, s.SKVAR_SNAPSHOT], {
		cwd: main,
		encoding: 'utf8',
		env: env(),
		stdio: 'pipe'
	});
	return s;
}
const status = (cwd: string) => git(cwd, 'status', '--porcelain=v1', '--ignore-submodules=none');

beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), 'test-worktree-'));
	const sub = join(dir, 'sub-origin');
	main = join(dir, 'main');
	wt = join(dir, 'main-test');
	mkdirSync(sub);
	git(sub, 'init', '-q', '-b', 'site.fr');
	write(join(sub, 'page.svelte'), 'committed page\n');
	git(sub, 'add', '-A');
	git(sub, 'commit', '-q', '-m', 'page');

	mkdirSync(main);
	git(main, 'init', '-q', '-b', 'main');
	write(join(main, 'app.ts'), 'committed app\n');
	write(join(main, 'old.ts'), 'removed later\n');
	write(join(main, '.gitignore'), ['.env', '.env.*', 'dev.yml', 'images.yml', 'node_modules', ''].join('\n'));
	git(main, 'add', '-A');
	git(main, '-c', 'protocol.file.allow=always', 'submodule', 'add', '-q', '-b', 'site.fr', sub, 'sub');
	git(main, 'commit', '-q', '-m', 'base');

	for (const f of ['dev.yml', 'images.yml', '.env.dev.site.fr', '.env.staging.site.fr', '.env.test-all'])
		write(join(main, f), `${f} contents\n`);
	for (const f of ['.env.test.w0', '.env.site.lyon3', '.env.staging.site.fr.bak.20260814'])
		write(join(main, f), 'not an input\n');
	execFileSync('ln', ['-s', '.env.dev.site.fr', join(main, '.env')]);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('test-worktree.sh', () => {
	it("checks out the snapshot, uncommitted changes included, and skvar's own", () => {
		write(join(main, 'app.ts'), 'edited app\n');
		write(join(main, 'sub', 'page.svelte'), 'edited page\n');
		const s = prepare();
		expect(git(wt, 'rev-parse', 'HEAD')).toBe(s.SNAPSHOT);
		expect(read(join(wt, 'app.ts'))).toBe('edited app\n');
		expect(git(join(wt, 'sub'), 'rev-parse', 'HEAD')).toBe(s.SKVAR_SNAPSHOT);
		expect(read(join(wt, 'sub', 'page.svelte'))).toBe('edited page\n');
	});

	it('follows a later snapshot, dropping what it no longer holds and keeping its own ignored files', () => {
		prepare();
		mkdirSync(join(wt, 'node_modules'));
		write(join(wt, 'node_modules', 'kept'), 'installed\n');
		unlinkSync(join(main, 'old.ts'));
		write(join(main, 'app.ts'), 'second edit\n');
		write(join(main, 'sub', 'page.svelte'), 'second page\n');
		prepare();
		expect(existsSync(join(wt, 'old.ts'))).toBe(false);
		expect(read(join(wt, 'app.ts'))).toBe('second edit\n');
		expect(read(join(wt, 'sub', 'page.svelte'))).toBe('second page\n');
		expect(read(join(wt, 'node_modules', 'kept'))).toBe('installed\n');
	});

	it('links the ignored inputs back to the checkout', () => {
		prepare();
		for (const f of ['dev.yml', 'images.yml', '.env.dev.site.fr', '.env.staging.site.fr', '.env.test-all']) {
			expect(lstatSync(join(wt, f)).isSymbolicLink(), f).toBe(true);
			expect(readlinkSync(join(wt, f)), f).toBe(join(main, f));
		}
	});

	it('leaves the generated files, backups and .env itself to the worktree', () => {
		prepare();
		for (const f of ['.env', '.env.test.w0', '.env.site.lyon3', '.env.staging.site.fr.bak.20260814'])
			expect(existsSync(join(wt, f)), f).toBe(false);
	});

	it('leaves the checkout alone', () => {
		write(join(main, 'app.ts'), 'edited app\n');
		write(join(main, 'sub', 'page.svelte'), 'edited page\n');
		const before = { main: status(main), sub: status(join(main, 'sub')), branch: git(join(main, 'sub'), 'branch', '--show-current') };
		prepare();
		prepare();
		expect({ main: status(main), sub: status(join(main, 'sub')), branch: git(join(main, 'sub'), 'branch', '--show-current') }).toEqual(before);
	});
});

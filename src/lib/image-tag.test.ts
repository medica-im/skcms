import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

/**
 * The immutable tag a build stamps alongside :latest.
 *
 * Every image was pushed as :latest and nothing else, so a bad deploy had
 * nothing to go back to: pushing moves that one pointer, and the deploy script
 * prunes the layers it displaced. The commit was recorded in an image *label*,
 * which says what an image is but cannot be used to ask a registry for it —
 * only a tag addresses an image.
 *
 * The logic lives in scripts/image-tag.sh so it can be checked here rather than
 * only by pushing something and looking at ghcr.
 */

const SCRIPT = resolve(__dirname, '../../scripts/image-tag.sh');

/** Runs the script with a fabricated git state, so no repo is needed. */
function tagFor(env: Record<string, string>): string {
	return execFileSync('bash', [SCRIPT], {
		env: { ...process.env, ...env },
		encoding: 'utf8'
	}).trim();
}

const CLEAN = {
	IMAGE_TAG_GIT_SHA: '4370998aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
	IMAGE_TAG_SUBMODULE_SHA: 'a1b2c3dbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
	IMAGE_TAG_DIRTY: '0'
};

describe('the immutable image tag', () => {
	it('is built from both repositories', () => {
		// An image depends on skcms and on the skvar submodule. Two sites built
		// from the same skcms commit but different skvar branches must not land
		// on the same tag.
		expect(tagFor(CLEAN)).toBe('4370998-a1b2c3d');
	});

	it('uses short shas, so the tag stays readable when pasted into a rollback', () => {
		expect(tagFor(CLEAN)).toMatch(/^[0-9a-f]{7}-[0-9a-f]{7}$/);
	});

	it('says so when the tree was dirty', () => {
		// Building with uncommitted changes means the sha names a commit that
		// does not contain what is in the image. The tag has to admit that rather
		// than claim to be that commit.
		expect(tagFor({ ...CLEAN, IMAGE_TAG_DIRTY: '1' })).toBe('4370998-a1b2c3d-dirty');
	});

	it('changes when either repository moves', () => {
		const base = tagFor(CLEAN);
		const parentMoved = tagFor({ ...CLEAN, IMAGE_TAG_GIT_SHA: 'deadbee' + 'f'.repeat(33) });
		const submoduleMoved = tagFor({
			...CLEAN,
			IMAGE_TAG_SUBMODULE_SHA: 'cafebab' + 'e'.repeat(33)
		});
		expect(parentMoved).not.toBe(base);
		expect(submoduleMoved).not.toBe(base);
		expect(parentMoved).not.toBe(submoduleMoved);
	});

	it('is a tag Docker will accept', () => {
		// Docker tags allow [A-Za-z0-9_.-] after an alphanumeric, up to 128 chars.
		for (const dirty of ['0', '1']) {
			const tag = tagFor({ ...CLEAN, IMAGE_TAG_DIRTY: dirty });
			expect(tag).toMatch(/^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/);
		}
	});
});

/**
 * Whether a tree counts as dirty, decided against real repositories rather than
 * injected. The tests above hand the answer in, so none of them exercised the
 * detection — and the detection was wrong: it called every build dirty.
 */
describe('deciding that a tree is dirty', () => {
	let parent: string;
	let sub: string;
	const git = (cwd: string, ...args: string[]) =>
		execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();

	beforeEach(() => {
		// A submodule, and a parent that embeds it, so the pointer can move the
		// way a build moves it.
		sub = mkdtempSync(join(tmpdir(), 'sub-'));
		git(sub, 'init', '-q', '-b', 'main');
		git(sub, 'config', 'user.email', 't@t.test');
		git(sub, 'config', 'user.name', 'test');
		writeFileSync(join(sub, 'a'), '1');
		git(sub, 'add', '.');
		git(sub, 'commit', '-qm', 'one');

		parent = mkdtempSync(join(tmpdir(), 'parent-'));
		git(parent, 'init', '-q', '-b', 'main');
		git(parent, 'config', 'user.email', 't@t.test');
		git(parent, 'config', 'user.name', 'test');
		git(parent, '-c', 'protocol.file.allow=always', 'submodule', 'add', '-q', sub, 'sub');
		writeFileSync(join(parent, 'top'), '1');
		git(parent, 'add', '.');
		git(parent, 'commit', '-qm', 'parent');
	});

	afterEach(() => {
		rmSync(parent, { recursive: true, force: true });
		rmSync(sub, { recursive: true, force: true });
	});

	/** The script, run inside the fake parent with the fake submodule path. */
	const tagIn = (cwd: string) =>
		execFileSync('bash', [SCRIPT], {
			cwd,
			env: { ...process.env, IMAGE_TAG_SUBMODULE_PATH: 'sub' },
			encoding: 'utf8'
		}).trim();

	it('is not dirty when nothing has been edited', () => {
		expect(tagIn(parent)).not.toMatch(/-dirty$/);
	});

	it('is not dirty merely because the submodule moved', () => {
		// What every build does: check out the site's branch in the submodule.
		// The pointer then differs from the commit the parent records, and
		// `git status` reports " M sub" — but nothing has been *edited*, and the
		// submodule's own commit is already named in the tag. Counting this as
		// dirty put a -dirty suffix on every build there has ever been.
		// The submodule inside the parent is its own clone, so it does not carry
		// the identity configured on the original.
		git(join(parent, 'sub'), 'config', 'user.email', 't@t.test');
		git(join(parent, 'sub'), 'config', 'user.name', 'test');
		git(join(parent, 'sub'), 'checkout', '-qb', 'other');
		writeFileSync(join(parent, 'sub', 'b'), '2');
		git(join(parent, 'sub'), 'add', '.');
		git(join(parent, 'sub'), 'commit', '-qm', 'another site');

		expect(git(parent, 'status', '--porcelain')).toContain('sub');
		expect(tagIn(parent)).not.toMatch(/-dirty$/);
	});

	it('is dirty when a tracked file in the parent was edited', () => {
		writeFileSync(join(parent, 'top'), 'changed');
		expect(tagIn(parent)).toMatch(/-dirty$/);
	});

	it('is dirty when a file inside the submodule was edited', () => {
		// This one really is uncommitted content that ends up in the image.
		writeFileSync(join(parent, 'sub', 'a'), 'changed');
		expect(tagIn(parent)).toMatch(/-dirty$/);
	});
});

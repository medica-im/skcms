import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export type SkvarFile = {
	source: string;
	/** Where the source came from, for error messages. */
	origin: string;
	/** Set when the source is the file on disk, so a caller can import it in place. */
	workingTreeFile?: string;
};

const SUBMODULE = fileURLToPath(new URL('../routes/(skvar)', import.meta.url));

/**
 * One tenant's skvar file, at the version under test, from any checkout.
 *
 * For skcms tests about a page that lives in a single tenant's branch. In
 * order, the first that applies is authoritative:
 *
 *   1. test-all's skvar snapshot, when the run was started on `branch`
 *      (TEST_ALL_SKVAR_BRANCH): uncommitted edits included, whichever tenant
 *      the run has checked out;
 *   2. the working tree, when `branch` is checked out;
 *   3. the committed branch.
 *
 * A file missing from the source that applies is an error, not a cue to try
 * the next one: that one would be an older version.
 */
export function skvarSource(
	branch: string,
	path: string,
	{
		submodule = SUBMODULE,
		env = process.env
	}: { submodule?: string; env?: Record<string, string | undefined> } = {}
): SkvarFile {
	const git = (...args: string[]) =>
		execFileSync('git', args, { cwd: submodule, encoding: 'utf8', stdio: 'pipe' });
	const show = (rev: string, origin: string): SkvarFile => {
		try {
			return { source: git('show', `${rev}:${path}`), origin };
		} catch {
			throw new Error(`${path} is not in ${origin} (${submodule})`);
		}
	};

	const snapshot = env.TEST_ALL_SKVAR_SNAPSHOT;
	if (snapshot && env.TEST_ALL_SKVAR_BRANCH === branch) {
		return show(snapshot, `the test-all snapshot ${snapshot.slice(0, 8)} of ${branch}`);
	}

	let checkedOut = '';
	try {
		checkedOut = git('symbolic-ref', '-q', '--short', 'HEAD').trim();
	} catch {
		// Detached: no branch is checked out.
	}
	if (checkedOut === branch) {
		const file = join(submodule, path);
		if (!existsSync(file)) throw new Error(`${path} is not in the working tree on ${branch} (${submodule})`);
		return { source: readFileSync(file, 'utf8'), origin: `the working tree on ${branch}`, workingTreeFile: file };
	}

	return show(branch, `branch ${branch}`);
}

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

/**
 * A tenant's own unit tests: the ones its skvar branch carries.
 *
 * test-all runs the whole unit suite once, then, for every other tenant, only
 * the tests in that tenant's branch. The rest of the suite gives the same
 * answer whichever tenant is checked out, so repeating it per tenant cost
 * minutes and proved nothing; a branch's own tests exist on that branch alone,
 * so they are the part a per-tenant pass is for. Found rather than listed, so
 * a test added to a branch is run without anyone editing test-all.
 *
 * The patterns are vitest's (vite.config.ts): `*.{test,spec}.{js,ts}` for the
 * unit project, which `*.svelte.test.ts` component tests also match, and not
 * the branch's `tests/` directory, which holds its Playwright specs.
 */

const SCRIPT = resolve(__dirname, '../../scripts/skvar-tests.sh');

let root: string;
const SKVAR = 'src/routes/(skvar)';

const touch = (path: string) => {
	mkdirSync(dirname(join(root, SKVAR, path)), { recursive: true });
	writeFileSync(join(root, SKVAR, path), '');
};
const list = () =>
	execFileSync('bash', [SCRIPT, SKVAR], { cwd: root, encoding: 'utf8' })
		.split('\n')
		.filter(Boolean)
		.sort();

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'skvar-tests-'));
	mkdirSync(join(root, SKVAR), { recursive: true });
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("listing a tenant's own tests", () => {
	it('finds unit and component tests at any depth, as paths vitest accepts from the root', () => {
		touch('sitemap.xml/sitemap.test.ts');
		touch('contact/load.spec.js');
		touch('(var)/Banner.svelte.test.ts');
		expect(list()).toEqual([
			`${SKVAR}/(var)/Banner.svelte.test.ts`,
			`${SKVAR}/contact/load.spec.js`,
			`${SKVAR}/sitemap.xml/sitemap.test.ts`
		]);
	});

	it('leaves out the Playwright specs and the source files', () => {
		touch('tests/contact-layout.spec.ts');
		touch('contact/+page.server.ts');
		touch('(var)/variables.ts');
		expect(list()).toEqual([]);
	});

	it('lists nothing, and succeeds, for a branch without tests', () => {
		touch('+page.svelte');
		expect(list()).toEqual([]);
	});
});

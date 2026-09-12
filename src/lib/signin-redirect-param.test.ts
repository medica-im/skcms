import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

/**
 * Every signin link must name the parameter the signin page reads.
 *
 * The app sent users to signin under two different names. `redirect` came
 * first; `redirectTo` arrived with @auth/sveltekit, whose own API reads
 * `redirectTo` off the posted form and turns it into callbackUrl — so the
 * hidden input on the signin page already had to use that name. The migration
 * was never finished, leaving both in the tree.
 *
 * The signin page read only one of them, so half the callers lost their
 * destination and fell back to a hardcoded '/dashboard'. That looked harmless
 * for a year because `base` is '' on every site served at its own root, which
 * makes the fallback and the real target identical. It is not identical on an
 * instance served under a base path: unipa has BASE_PATH=/annuaire, so signing
 * in landed on https://dev.unipa.fr/dashboard — WordPress, not the app.
 *
 * Checked as source text because these are redirects inside server guards:
 * exercising them for real means a browser and a session per route.
 */
const root = resolve(__dirname, '../..');

/** Every signin link in src, as `file:line: text`. */
function signinLinks(): string[] {
	try {
		return execFileSync(
			'grep',
			['-rn', '--include=*.ts', '--include=*.svelte', 'signin?redirect', 'src/'],
			{ cwd: root, encoding: 'utf8' }
		)
			.split('\n')
			.filter(Boolean)
			// This file names both spellings to describe them; it is not a caller.
			.filter((l) => !l.startsWith('src/lib/signin-redirect-param.test.ts'));
	} catch {
		return [];
	}
}

describe('the signin redirect parameter', () => {
	it('is named redirectTo everywhere, matching @auth/sveltekit', () => {
		// `signin?redirect=` — the old name. Anchored on the '=' so it cannot
		// match `redirectTo=`.
		const old = signinLinks().filter((l) => l.includes('signin?redirect='));
		expect(old).toEqual([]);
	});

	it('has links to check at all, so the test cannot pass by finding nothing', () => {
		const links = signinLinks();
		expect(links.length).toBeGreaterThan(10);
		expect(links.every((l) => l.includes('signin?redirectTo='))).toBe(true);
	});

	const page = readFileSync(resolve(root, 'src/routes/(common)/signin/+page.svelte'), 'utf8');

	it('is the name the signin page reads from the query string', () => {
		expect(page).toMatch(/searchParams\.get\(['"]redirectTo['"]\)/);
		expect(page).not.toMatch(/searchParams\.get\(['"]redirect['"]\)/);
	});

	it('falls back to a destination inside the app, not the site root', () => {
		// A bare /dashboard is WordPress's root on an instance served under a
		// base path. The fallback has to carry `base` like every other link.
		expect(page).toMatch(/\$\{base\}\/dashboard/);
	});
});

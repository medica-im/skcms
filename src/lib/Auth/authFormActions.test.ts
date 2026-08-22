import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

/**
 * Every auth form must post inside this app, not to the site root.
 *
 * @auth/sveltekit's SignIn and SignOut components build their action as
 *
 *     action={`/${signInPage}`}      // default "signin"
 *     action={`/${signOutPage}`}     // default "signout"
 *
 * with no knowledge of kit's base path. Left at the default, an instance served
 * under one posts to /signin or /signout at the DOMAIN root — on unipa.fr that
 * is WordPress, which answers with an HTML 404, and the browser reports
 * "Unexpected token '<' ... is not valid JSON".
 *
 * Passing the prop is the only hook the library offers, so it has to be passed
 * at EVERY use site. That is what this test is for: the standalone /signout
 * page was fixed while the same component in the app bar — the one a signed-in
 * person actually clicks — was left at the default and kept failing. A test
 * that checked one file would have passed.
 */

/** Every .svelte file under src/, so a new use site is covered on arrival. */
function svelteFiles(dir: string, found: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		const path = join(dir, entry);
		if (statSync(path).isDirectory()) {
			if (entry !== 'node_modules') svelteFiles(path, found);
		} else if (entry.endsWith('.svelte')) {
			found.push(path);
		}
	}
	return found;
}

const src = resolve(import.meta.dirname, '../..');
const files = svelteFiles(src).map((path) => ({ path, text: readFileSync(path, 'utf8') }));

/** Files that mount one of the two components. */
const users = (component: 'SignIn' | 'SignOut') =>
	files.filter(
		(f) =>
			f.text.includes(`from '@auth/sveltekit/components'`) &&
			new RegExp(`import \\{[^}]*\\b${component}\\b`).test(f.text) &&
			new RegExp(`<${component}[\\s>]`).test(f.text)
	);

describe.each([
	['SignIn', 'signInPage'],
	['SignOut', 'signOutPage']
] as const)('%s', (component, prop) => {
	it('is used somewhere — otherwise this test proves nothing', () => {
		expect(users(component).length).toBeGreaterThan(0);
	});

	it(`passes ${prop} at every use site`, () => {
		const missing = users(component)
			.filter((f) => !f.text.includes(`${prop}={`))
			.map((f) => f.path.slice(src.length + 1));

		expect(
			missing,
			`these mount <${component}> without ${prop}, so the form posts to the ` +
				`site root and escapes the base path: ${missing.join(', ')}`
		).toEqual([]);
	});

	it(`never leaves ${prop} at the library default`, () => {
		const hardcoded = users(component)
			.filter((f) => new RegExp(`${prop}="`).test(f.text))
			.map((f) => f.path.slice(src.length + 1));

		expect(
			hardcoded,
			`a literal ${prop}="..." ignores the base path: ${hardcoded.join(', ')}`
		).toEqual([]);
	});
});

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { APP_URL, PUBLIC_URL } from './appUrl';

/**
 * Browser-side URLs are relative, and nothing may assume otherwise.
 *
 * APP_URL is `base` in the browser — '' for a site at its own domain root — so
 * that one build can serve several hostnames and each request stays on the host
 * it arrived at. The BDD suite depends on it (w0..w3.dev.medica.im are four
 * tenants sharing a build), and so does dev.unipa.fr/annuaire.
 *
 * Code that treats it as an absolute URL breaks in the worst way. +layout.svelte
 * sliced 'https://' off it for Plausible's data-domain and threw when it was
 * not there — during HYDRATION, which aborts the whole client render. The page
 * painted from SSR and then vanished, with nothing in the server log: "page
 * seen briefly then disappears".
 *
 * These tests run under vitest's node environment, where `browser` is false, so
 * APP_URL resolves to the SSR address. What they pin is the SOURCE: that no
 * browser-reachable module assumes a scheme.
 */

const src = resolve(import.meta.dirname, '../..');

function sourceFiles(dir: string, found: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		const path = join(dir, entry);
		if (statSync(path).isDirectory()) {
			if (entry !== 'node_modules') sourceFiles(path, found);
		} else if (/\.(svelte|ts)$/.test(entry) && !entry.includes('.test.')) {
			found.push(path);
		}
	}
	return found;
}

const files = sourceFiles(src).map((path) => ({
	path: path.slice(src.length + 1),
	text: readFileSync(path, 'utf8')
}));

describe('the constants themselves', () => {
	it('APP_URL is a string', () => {
		expect(typeof APP_URL).toBe('string');
	});

	it('PUBLIC_URL is relative — it is what goes into markup', () => {
		// '' at a domain root, '/annuaire' under a base path. Never a scheme:
		// an <img src> carrying an absolute host points every tenant sharing
		// this build at one site's media.
		expect(PUBLIC_URL.startsWith('http')).toBe(false);
	});
});

describe('nothing strips a scheme off the app URL', () => {
	/** `X.slice('https://'.length)`, `X.startsWith('https')`, `new URL(X)`. */
	const ASSUMES_ABSOLUTE =
		/(variables\.BASE_URI|APP_URL|PUBLIC_URL)\s*\.\s*(slice|startsWith|replace|split)\s*\(|new URL\(\s*(variables\.BASE_URI|APP_URL|PUBLIC_URL)\s*[,)]/;

	it('no source file does', () => {
		const offenders = files.filter((f) => ASSUMES_ABSOLUTE.test(f.text)).map((f) => f.path);

		expect(
			offenders,
			`these treat the app URL as an absolute address, which it is not in ` +
				`the browser — a throw here happens during hydration and blanks the ` +
				`page: ${offenders.join(', ')}`
		).toEqual([]);
	});

	it('and the guard that used to is gone from the layout', () => {
		const layout = files.find((f) => f.path === 'routes/+layout.svelte');
		expect(layout, 'routes/+layout.svelte not found').toBeDefined();
		// The throw, not the words: the comment above the fix quotes the old
		// message on purpose, so matching the text alone fails on the
		// explanation rather than on the code.
		expect(
			layout!.text,
			'+layout.svelte throws when the base URI has no scheme; it is relative ' +
				'in the browser, so that throw runs on every page load and blanks it'
		).not.toMatch(/throw new Error\([^)]*must start with/);
	});
});

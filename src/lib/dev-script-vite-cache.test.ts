import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * dev.sh clears the Vite prebundles when the Svelte version changes.
 *
 * Vite prebundles dependencies that ship raw .svelte source and does not
 * reliably invalidate them on a Svelte bump, so it serves chunks compiled by
 * the old compiler against the new runtime. The calling convention between the
 * two changes across minor versions — 5.51.5 -> 5.57.0 turned rest_props'
 * `exclude` from an Array into a Set — and the cached chunks then throw
 * `target.exclude.has is not a function` during hydration.
 *
 * The failure is expensive to diagnose because it looks like something else
 * entirely: the page server-renders 200 and only then dies, so nothing becomes
 * interactive and every feature fails at once with "element not found",
 * blaming whichever component the stack happened to name first. A whole test
 * suite went red for this, and the libraries it pointed at were innocent.
 *
 * Checked as source text rather than by running the script: dev.sh ends in
 * `exec vite` and would not return.
 */
const source = readFileSync(resolve(__dirname, '../../scripts/dev.sh'), 'utf8');

describe('dev.sh: stale Vite prebundles after a Svelte upgrade', () => {
	it('reads the installed Svelte version', () => {
		// The installed tree is the authority. package.json carries a range, and
		// Vite's own _metadata.json records no Svelte version at all.
		expect(source).toMatch(/node_modules\/svelte\/package\.json/);
	});

	it('compares it against a stamp it keeps itself', () => {
		expect(source).toMatch(/VITE_STAMP=/);
		expect(source).toMatch(/STAMPED=/);
		expect(source).toMatch(/"\$STAMPED" != "\$SVELTE_VERSION"/);
	});

	it('deletes the caches rather than merely restarting', () => {
		// Restarting is not enough — the chunks are on disk. Both the per-worker
		// caches the BDD suite creates and the shared one must go.
		const guard = source.slice(source.indexOf('VITE_STAMP='));
		expect(guard).toMatch(/rm -rf[^\n]*\.vite-w/);
		expect(guard).toMatch(/rm -rf[^\n]*node_modules\/\.vite\b/);
	});

	it('records the new version so the next run does not clear again', () => {
		expect(source).toMatch(/printf '%s' "\$SVELTE_VERSION" > "\$VITE_STAMP"/);
	});

	it('clears before starting the server, not after', () => {
		// A cache cleared after `exec vite` would never be cleared at all.
		expect(source.indexOf('VITE_STAMP=')).toBeLessThan(source.indexOf('exec pnpm exec vite'));
	});

	it('says why, so the next reader does not blame a library', () => {
		expect(source).toMatch(/exclude\.has is not a function/);
	});
});

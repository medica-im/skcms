import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * A finished clone has to refresh what this tab is holding.
 *
 * The backend drops its own cached payloads, but the browser is still showing
 * the entries and facilities it loaded before — so a cloned entry is absent
 * from the directory, the map and the admin table until something forces a
 * refetch. The results screen links straight to /e/{slug}, which works because
 * it is fetched by uid, and that is exactly what makes the staleness elsewhere
 * easy to miss.
 *
 * Asserted against the source: the alternative is driving a whole clone in a
 * browser to observe a refetch, which is a lot of machinery to prove one call
 * is present.
 */
const source = readFileSync('src/routes/(common)/web/clone/+page.svelte', 'utf8');

describe('the wizard is never a dead end', () => {
	it('offers a way back from the verify step to the entry list', () => {
		// The common reason to reach verify and be unable to continue is a
		// blocker — "this person, occupation and place already exist here" — and
		// the only useful response is to pick different entries.
		expect(source).toMatch(/function backToBrowse\s*\(/);
		expect(source).toMatch(/onclick=\{backToBrowse\}/);
	});

	it('offers a way back from the entry list to the instance picker', () => {
		expect(source).toMatch(/function backToInstance\s*\(/);
		expect(source).toMatch(/onclick=\{backToInstance\}/);
	});

	it('does not offer to clone when nothing can be cloned', () => {
		// An all-blocked batch would otherwise report success having written
		// nothing, which reads as "it worked".
		expect(source).toMatch(/disabled=\{busy \|\| clonable === 0\}/);
	});
});

describe('after a successful clone', () => {
	it('invalidates the entries the layout loaded', () => {
		// `app:entries` is declared by src/routes/+layout.server.ts and
		// +layout.ts — the directory listing and the admin table read it.
		expect(source).toMatch(/invalidate\(\s*['"]app:entries['"]\s*\)/);
	});

	it('invalidates the facilities the home page loaded', () => {
		// `app:facilities` is declared by (skvar)/+page.ts, which draws the map.
		expect(source).toMatch(/invalidate\(\s*['"]app:facilities['"]\s*\)/);
	});

	it('only refreshes when something was actually created', () => {
		// A batch that failed or was skipped has changed nothing, and refetching
		// the whole directory to display "0 created" is wasted work.
		expect(source).toMatch(/status === 'created'[\s\S]{0,200}invalidate/);
	});
});

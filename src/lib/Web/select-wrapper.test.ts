import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * The dropdown of a svelte-select opens *upwards* when there is no room below
 * it. Inside a <dialog> that draws the list past the top of the box, over the
 * page behind the modal, where the options can be neither seen nor clicked —
 * and it is the first option that is lost, so the select still looks usable
 * and simply offers one choice fewer.
 *
 * $lib/Web/Select.svelte wraps svelte-select with the fixed positioning
 * strategy that avoids this, so every select in the application has to come
 * from there rather than from the library directly.
 *
 * Checked by reading the source rather than by driving a browser: the selects
 * live behind a dozen routes, roles and dialogs, and a crawl that tries to open
 * all of them is slow and flaky. What actually regresses is an import, and an
 * import is cheap to check.
 */

const SRC = new URL('../../', import.meta.url).pathname;
/** The one file allowed to import the library: the wrapper itself. */
const WRAPPER = 'lib/Web/Select.svelte';

function svelteFiles(dir: string, found: string[] = []): string[] {
	for (const name of readdirSync(dir)) {
		const full = join(dir, name);
		if (statSync(full).isDirectory()) svelteFiles(full, found);
		else if (name.endsWith('.svelte')) found.push(full);
	}
	return found;
}

describe('svelte-select is only ever used through the wrapper', () => {
	const files = svelteFiles(SRC);

	it('finds the components to check', () => {
		// Guards the walk itself: a broken path would make every assertion below
		// pass over an empty list.
		expect(files.length).toBeGreaterThan(100);
	});

	it('no component imports svelte-select directly', () => {
		const offenders = files
			.filter((f) => /import\s+\w+\s+from\s+['"]svelte-select['"]/.test(readFileSync(f, 'utf8')))
			.map((f) => relative(SRC, f))
			.filter((f) => f !== WRAPPER);

		expect(
			offenders,
			`These import svelte-select directly instead of $lib/Web/Select.svelte, so their ` +
				`dropdown can open outside its dialog and hide the first option:\n  ` +
				offenders.join('\n  ')
		).toEqual([]);
	});

	it('the wrapper still applies the fixed positioning strategy', () => {
		// The reason the wrapper exists. Losing this line reintroduces the bug in
		// every select at once, with nothing else to notice it.
		const source = readFileSync(join(SRC, WRAPPER), 'utf8');
		expect(source).toMatch(/strategy:\s*'fixed'/);
	});

	it('the wrapper overrides every English default svelte-select would show', () => {
		// svelte-select ships English text in four places, and none of it looks
		// wrong on screen to someone who does not read English — the placeholder
		// said "Please select" in three dozen French modals for a long time, and
		// the aria live region still announced "You are currently focused on
		// option…" out loud to screen-reader users.
		//
		// Each has to be given a translated value by the wrapper. Listed by name
		// so that a future version of the library adding a fifth is a deliberate
		// decision rather than a silent regression.
		const wrapper = readFileSync(join(SRC, WRAPPER), 'utf8');
		for (const prop of ['placeholder', 'ariaValues', 'ariaListOpen', 'ariaFocused']) {
			expect(
				wrapper,
				`the wrapper does not set ${prop}, so svelte-select's English default is what a French user gets`
			).toMatch(new RegExp(`\\b${prop}\\b`));
		}
		// And those values must come from the message catalogue, not be literals.
		expect(
			wrapper,
			'the wrapper sets those props but not from $msgs, so they cannot be translated'
		).toMatch(/from '\$msgs'/);
	});

	it('every prop bound by a caller is declared bindable on the wrapper', () => {
		// A rest spread cannot carry a two-way binding: `bind:` on a prop the
		// wrapper does not name is silently one-way, so the parent never learns
		// what the user picked. Nothing looks wrong on screen, which is what makes
		// this worth pinning.
		const wrapper = readFileSync(join(SRC, WRAPPER), 'utf8');
		const bindable = new Set(
			[...wrapper.matchAll(/(\w+)\s*=\s*\$bindable\(/g)].map((m) => m[1])
		);

		const bound = new Set<string>();
		for (const f of files) {
			if (relative(SRC, f) === WRAPPER) continue;
			for (const tag of readFileSync(f, 'utf8').matchAll(/<Select\b(.*?)\/?>/gs)) {
				for (const b of tag[1].matchAll(/bind:(\w+)/g)) bound.add(b[1]);
			}
		}

		const missing = [...bound].filter((p) => !bindable.has(p));
		expect(
			missing,
			`Callers bind these, but the wrapper does not declare them $bindable, so the ` +
				`binding is one-way and the value never reaches the parent: ${missing.join(', ')}`
		).toEqual([]);
	});
});

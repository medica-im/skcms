import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve, join, dirname, relative } from 'node:path';

/**
 * The app bar's menus must paint over whatever the entry page stacks.
 *
 * The edit-mode toggle on /e/{slug} is a sticky banner inside the page's
 * scroll region. Both it and the header take part in the same stacking
 * context, so a header z-index at or below the banner's puts the toggle on
 * top of an open app bar menu. The header's own menus are stacked inside the
 * header, so the header's z-index is the ceiling for everything they meet.
 *
 * "Whatever the entry page stacks" is found by following imports from the
 * page, so a component added anywhere below it is covered without anyone
 * remembering to list it. Modals are not reached that way — they are opened
 * by name from the layout's registry and paint in the layout's own overlay,
 * above the page — which is the right answer for them.
 *
 * Browser-level stacking is not worth a Playwright run: the rule is a
 * comparison of two declared numbers, so this reads them from the source.
 */

const src = resolve(import.meta.dirname, '..');

const LAYOUT = join(src, 'routes/+layout.svelte');
/**
 * The route's .svelte alone reaches nothing: it renders `data.component`,
 * which +page.ts chooses among the entry layouts.
 */
const ENTRY_ROUTE = join(src, 'routes/(common)/e/[slug]');
const ENTRY_ROUTE_FILES = ['+page.svelte', '+page.ts'].map((f) => join(ENTRY_ROUTE, f));
const TOGGLE_BANNER = join(src, 'lib/components/Directory/EffectorContact.svelte');

const ALIASES: [string, string][] = [
	['$lib/', join(src, 'lib/')],
	['$assets/', join(src, 'assets/')]
];

const EXTENSIONS = ['', '.ts', '.js', '.svelte', '/index.ts', '/index.js', '/index.svelte'];

const IMPORT = /(?:\bfrom\s*|\bimport\s*\(\s*|^\s*import\s+)['"]([^'"]+)['"]/gm;

/**
 * A modal <dialog> lives in the browser's top layer and covers the app bar
 * whatever z-index is declared inside it, so a file that renders one is not
 * a stacking competitor (Patch.svelte lifts a select to z-index 1000 inside
 * its dialog). Coarse by file: a file mixing a dialog and a sticky element
 * would be skipped.
 */
const RENDERS_DIALOG = /<Dialog[\s>]|<dialog[\s>]/;

const Z_CLASS =/(?<![\w-])z-(?:\[(\d+)\]|(\d+))(?![\w-])/g;
const Z_CSS = /\bz-index:\s*(\d+)/g;

function zIndexes(source: string): number[] {
	return [
		...[...source.matchAll(Z_CLASS)].map((m) => Number(m[1] ?? m[2])),
		...[...source.matchAll(Z_CSS)].map((m) => Number(m[1]))
	];
}

function resolveImport(from: string, specifier: string): string | null {
	let base: string;
	const alias = ALIASES.find(([prefix]) => specifier.startsWith(prefix));
	if (alias) base = alias[1] + specifier.slice(alias[0].length);
	else if (specifier.startsWith('.')) base = resolve(dirname(from), specifier);
	else return null;

	for (const ext of EXTENSIONS) {
		const candidate = base + ext;
		if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
	}
	return null;
}

/** Every source file reachable from `entries` by static or dynamic import. */
function reachable(entries: string[]): Set<string> {
	const seen = new Set<string>();
	const queue = [...entries];
	while (queue.length) {
		const file = queue.pop()!;
		if (seen.has(file)) continue;
		seen.add(file);
		const source = readFileSync(file, 'utf8');
		for (const [, specifier] of source.matchAll(IMPORT)) {
			const target = resolveImport(file, specifier);
			if (target && /\.(svelte|ts|js)$/.test(target)) queue.push(target);
		}
	}
	return seen;
}

function headerZIndex(): number {
	const slot = readFileSync(LAYOUT, 'utf8').match(/slotHeader="([^"]*)"/);
	expect(slot, 'AppShell must set slotHeader').not.toBeNull();
	const [z] = zIndexes(slot![1]);
	expect(z, 'slotHeader must carry a z-index').toBeDefined();
	return z;
}

describe('app bar stacking', () => {
	const files = reachable(ENTRY_ROUTE_FILES);

	it('puts the header above every z-index the entry page can render', () => {
		const header = headerZIndex();
		const offenders: string[] = [];

		for (const file of files) {
			const source = readFileSync(file, 'utf8');
			if (RENDERS_DIALOG.test(source)) continue;
			for (const z of zIndexes(source)) {
				if (z >= header) offenders.push(`${relative(src, file)}: z-${z} >= header z-${header}`);
			}
		}

		expect(offenders).toEqual([]);
	});

	it('reaches the edit-mode toggle banner from the page, so the check above is not vacuous', () => {
		expect(files.has(TOGGLE_BANNER)).toBe(true);
		expect(Math.max(...zIndexes(readFileSync(TOGGLE_BANNER, 'utf8')))).toBeGreaterThanOrEqual(50);
	});
});

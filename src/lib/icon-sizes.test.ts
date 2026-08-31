import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

/**
 * No icon may take its size from JavaScript.
 *
 * svelte-fa 4.0.4 sizes an icon two different ways, and only one of them
 * survives server rendering:
 *
 *   * keyword sizes (lg, sm, xs) are CSS classes — but the package marks
 *     `.svelte-fa-base` `:global` while leaving the size rules scoped to its
 *     own component, so the class lands in the SSR markup with no stylesheet
 *     to interpret it until hydration. app.postcss redeclares those three
 *     rules globally, which is what makes them safe to use.
 *
 *   * numeric sizes (2x, 3x, 1.5x) are applied by `setCustomFontSize`, a call
 *     on the mounted element. Nothing can server-render them: the icon paints
 *     at 1em and jumps to its real size when the component hydrates. On the
 *     canicule page that was eight icons going 16px to 24 and 32 at ~640ms,
 *     on every reload.
 *
 * So the rule is: use a keyword size, or set font-size on the icon or its
 * container. Both are plain CSS and are in the first paint.
 *
 * 4.0.4 is the latest published version — this is not a lag we can update out
 * of, so the check stays until the package changes shape.
 */

const src = resolve(import.meta.dirname, '..');

/**
 * Components that only ever exist in the browser, where there is no
 * server-rendered paint for a JS-applied size to disagree with. A marker is
 * created by MapLibre after the map initialises; it is never in the HTML.
 */
const CLIENT_ONLY = ['lib/MapLibre/MapLibre.svelte', 'lib/MapLibre/MapLibreClustered.svelte'];

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

const files = svelteFiles(src).map((path) => ({
	path: path.slice(src.length + 1),
	text: readFileSync(path, 'utf8')
}));

/** Every <Fa …> tag in a file, with the line it starts on. */
function faTags(text: string) {
	const tags: { tag: string; line: number }[] = [];
	// <Fa …> only — never <FaLayers>, and never a <select size="3">.
	const re = /<Fa(?![A-Za-z])[^>]*>/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(text))) {
		tags.push({ tag: m[0], line: text.slice(0, m.index).split('\n').length });
	}
	return tags;
}

describe('icon sizes', () => {
	it('finds the icons it is meant to be checking', () => {
		// Guards against the regex silently matching nothing, which would make
		// every assertion below vacuously pass.
		const total = files.reduce((n, f) => n + faTags(f.text).length, 0);
		expect(total).toBeGreaterThan(100);
	});

	it('never sizes a server-rendered icon from JavaScript', () => {
		const offenders: string[] = [];
		for (const file of files) {
			if (CLIENT_ONLY.includes(file.path)) continue;
			for (const { tag, line } of faTags(file.text)) {
				const size = tag.match(/\ssize=["'](\d[^"']*)["']/);
				if (size) offenders.push(`${file.path}:${line} size="${size[1]}"`);
			}
		}
		expect(
			offenders,
			`These icons take their size from JS, so they paint at 1em and jump on ` +
				`hydration. Use a keyword size (lg/sm/xs) or style="font-size:Nem":\n` +
				offenders.join('\n')
		).toEqual([]);
	});

	it('keeps the keyword size rules declared globally', () => {
		// The keyword sizes are only safe because app.postcss redeclares them;
		// without that they have the same problem as the numeric ones.
		const css = readFileSync(join(src, 'app.postcss'), 'utf8');
		for (const size of ['lg', 'sm', 'xs']) {
			expect(css, `app.postcss must declare .svelte-fa-size-${size}`).toContain(
				`.svelte-fa-size-${size}`
			);
		}
	});
});

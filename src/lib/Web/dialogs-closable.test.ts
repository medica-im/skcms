import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

/**
 * Every native dialog of the app can be closed from inside.
 *
 * A component that opens a <Dialog> with showModal() owns its closing: nothing
 * outside it knows the dialog is open. A dialog opened but never closed in the
 * component's own code keeps the page inert behind its backdrop. The
 * component tests mount a handful of these; this is the net under the rest.
 */
const src = resolve(import.meta.dirname, '../..');

function svelteFiles(dir: string, found: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		const path = join(dir, entry);
		if (statSync(path).isDirectory()) {
			if (entry !== 'node_modules' && entry !== '(skvar)') svelteFiles(path, found);
		} else if (entry.endsWith('.svelte')) {
			found.push(path);
		}
	}
	return found;
}

const openers = svelteFiles(src)
	.map((path) => ({ name: relative(src, path), text: readFileSync(path, 'utf8') }))
	.filter(({ text }) => /\.showModal\(\)/.test(text) && /<Dialog\b/.test(text));

describe('a component opening a native dialog', () => {
	it('exists — otherwise the check below proves nothing', () => {
		expect(openers.length).toBeGreaterThan(40);
	});

	it('closes it too', () => {
		const neverClosed = openers
			.filter(({ text }) => !/\.close\(\)/.test(text))
			.map(({ name }) => name);

		expect(neverClosed).toEqual([]);
	});
});

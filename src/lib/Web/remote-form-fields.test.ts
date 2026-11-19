import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

/**
 * SvelteKit 3 throws `form_field_unbound` on every input, focusout and submit
 * of a remote form that holds a named element it did not create with
 * `form.fields.x.as(...)`. The form then cannot be submitted at all, and
 * nothing fails until someone opens the dialog: toggling edit mode on an
 * entry page logged it for the phone, email, website and social-media forms.
 */

const ROOT = resolve(__dirname, '../../..');
const SRC = join(ROOT, 'src');

function svelteFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) return svelteFiles(path);
		return path.endsWith('.svelte') ? [path] : [];
	});
}

const remoteForms = svelteFiles(SRC).filter((file) => /\.enhance\(|<form \{\.\.\./.test(readFileSync(file, 'utf8')));

/** The `<form>…</form>` blocks of a component that are bound to a remote form. */
function remoteFormBlocks(source: string): string[] {
	return [...source.matchAll(/<form\s+\{\.\.\.[\s\S]*?<\/form>/g)].map((m) => m[0]);
}

describe('remote form components', () => {
	it('find the components to check', () => {
		expect(remoteForms.length).toBeGreaterThan(30);
	});

	it.each(remoteForms.map((file) => [relative(ROOT, file), file]))(
		'%s names its inputs only through fields.x.as(...)',
		(_label, file) => {
			const raw = remoteFormBlocks(readFileSync(file, 'utf8'))
				.flatMap((block) => [...block.matchAll(/<(?:input|select|textarea)\b[\s\S]*?\/?>(?=\s*(?:<|\{[#/:@]))/g)])
				.map((m) => m[0])
				.filter((tag) => /\sname=["{]/.test(tag));

			expect(raw, 'a raw name="…" makes the form throw form_field_unbound').toEqual([]);
		}
	);
});

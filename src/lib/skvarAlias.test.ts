import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

/**
 * That shared code reaches the site's skvar through the `$skvar` alias.
 *
 * A test site server (scripts/site-routes.sh) renders its tenant's skvar from a
 * worktree, and svelte.config.js points `$skvar`, `$var` and `$svlt` at it. A
 * relative path such as `../../routes/(skvar)/...` bypasses that and reaches
 * the submodule — whichever tenant's branch it is sitting on. It builds and
 * renders without an error, as another site:
 *
 * - src/hooks.ts globbed it for the /contact fallback, and dev.unipa.fr served
 *   Lyon 3's contact page (2026-10-02);
 * - src/lib/SiteMenu/siteMenu.ts globbed it for the parent site's menu, and
 *   dev.unipa.fr showed the generic app bar instead of unipa's (2026-10-07).
 *
 * Production never shows it: its image is built with the submodule on the
 * site's own branch, where both paths name the same file.
 */

const ROOT = resolve(__dirname, '../..');
const SRC = join(ROOT, 'src');
const SKVAR = join(SRC, 'routes', '(skvar)');

function sources(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) {
			// skvar itself may name its own directories; paraglide is generated.
			return path === SKVAR || entry.name.startsWith('paraglide') ? [] : sources(path);
		}
		return /\.(ts|js|svelte)$/.test(entry.name) && !/\.test\.ts$/.test(entry.name) ? [path] : [];
	});
}

// Comments may say why the alias is used — src/hooks.ts does.
const strip = (src: string) =>
	src
		.replace(/<!--[\s\S]*?-->/g, '')
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/^\s*\/\/.*$/gm, '');

describe('the path to skvar', () => {
	it('goes through $skvar, never a relative path to (skvar)', () => {
		const relativeToSkvar = /['"`][^'"`\n]*\(skvar\)\/[^'"`\n]*['"`]/g;
		const found = sources(SRC).flatMap((file) =>
			(strip(readFileSync(file, 'utf8')).match(relativeToSkvar) ?? []).map(
				(path) => `${relative(ROOT, file)}: ${path}`
			)
		);
		expect(found).toEqual([]);
	});
});

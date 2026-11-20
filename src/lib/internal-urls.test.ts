import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

/**
 * The app's own URLs go through resolve() from $app/paths, never as literals.
 *
 * unipa serves the app under /annuaire. A literal '/web/email' handed to goto,
 * redirect or an action belongs to whatever serves the domain root there, and
 * SvelteKit 3's goto rejects for a path that matches no route. On a site served
 * at its root the literal and the resolved URL are identical, so nothing fails
 * until the app is deployed under a prefix.
 *
 * A page that opens a dialog through goto(href, { shallow: true, state }) must
 * also await every goto it makes: the dialog reads page.state, which is only
 * set once the promise settles.
 *
 * Checked as source text across the whole tree, so that a new use site is
 * covered on arrival.
 */
const src = resolve(import.meta.dirname, '..');

function sourceFiles(dir: string, found: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		const path = join(dir, entry);
		if (statSync(path).isDirectory()) {
			if (entry !== 'node_modules' && entry !== '(skvar)') sourceFiles(path, found);
		} else if (/\.(svelte|ts)$/.test(entry) && !/\.(test|spec)\.ts$/.test(entry)) {
			found.push(path);
		}
	}
	return found;
}

const files = sourceFiles(src).map((path) => ({
	name: relative(src, path),
	text: readFileSync(path, 'utf8')
}));

/**
 * The first path segment of each page the app serves: web, sites, e, ghost...
 * Route groups and the fallback add no segment of their own, so their
 * children count as top-level.
 */
function topLevelRoutes(dir: string): string[] {
	return readdirSync(dir).flatMap((entry) => {
		if (!statSync(join(dir, entry)).isDirectory()) return [];
		if (entry.startsWith('(') || entry === '[fallback]') return topLevelRoutes(join(dir, entry));
		return /^[\[+_]/.test(entry) ? [] : [entry];
	});
}

const routeSegments = topLevelRoutes(join(src, 'routes/(common)'));

const withoutComments = (text: string) =>
	text.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('the app serves its pages under a base path', () => {
	it('knows which routes it serves — otherwise the check below proves nothing', () => {
		expect(routeSegments).toEqual(
			expect.arrayContaining(['web', 'sites', 'e', 'signin', 'contact', 'ghost'])
		);
	});

	it('never writes one of its own routes as a root-relative literal', () => {
		const literal = new RegExp(`[\`'"]/(?:${routeSegments.join('|')})\\b[^\`'"]*`, 'g');
		const offenders = files.flatMap(({ name, text }) =>
			withoutComments(text)
				.split('\n')
				.filter((line) => !/console\./.test(line))
				.flatMap((line) => [...line.matchAll(literal)].map((match) => `${name}: ${match[0]}`))
		);

		expect(offenders).toEqual([]);
	});
});

describe('a page that opens a dialog through a shallow goto', () => {
	const dialogOpeners = files.filter(({ text }) =>
		/\bgoto\([^;]*?shallow:\s*true,\s*state:\s*\{/s.test(text)
	);

	it('exists — otherwise the checks below prove nothing', () => {
		expect(dialogOpeners.length).toBeGreaterThan(0);
	});

	it('awaits every goto it makes', () => {
		const floating = dialogOpeners.flatMap(({ name, text }) =>
			withoutComments(text)
				.split('\n')
				.filter((line) => /(?<!await\s)(?<![\w.])goto\(/.test(line) && !/^\s*import\b/.test(line))
				.filter((line) => !/(=>|return)\s*goto\(/.test(line))
				.map((line) => `${name}: ${line.trim()}`)
		);
		expect(floating).toEqual([]);
	});
});

describe('goto is called the way SvelteKit 3 expects', () => {
	it('says replace, not the deprecated replaceState', () => {
		const deprecated = files.flatMap(({ name, text }) =>
			withoutComments(text)
				.split('\n')
				.filter((line) => /\breplaceState\s*:/.test(line))
				.map((line) => `${name}: ${line.trim()}`)
		);
		expect(deprecated).toEqual([]);
	});

	/** Index of the parenthesis closing the one at `open`, or -1. */
	const closingParen = (text: string, open: number): number => {
		let depth = 0;
		for (let i = open; i < text.length; i++) {
			if (text[i] === '(') depth++;
			else if (text[i] === ')' && --depth === 0) return i;
		}
		return -1;
	};

	const effectBodies = files.flatMap(({ name, text }) => {
		const code = withoutComments(text);
		return [...code.matchAll(/\$effect(?:\.pre)?\(/g)].map((match) => {
			const open = match.index + match[0].length - 1;
			return { name, body: code.slice(open, closingParen(code, open) + 1) };
		});
	});

	it('finds the effects of the app — otherwise the check below proves nothing', () => {
		expect(effectBodies.some(({ body }) => /\bgoto\(/.test(body))).toBe(true);
		expect(effectBodies.every(({ body }) => body.length > 1)).toBe(true);
	});

	it('handles the rejection of a goto made inside an effect, which cannot await it', () => {
		const floating = effectBodies.flatMap(({ name, body }) =>
			[...body.matchAll(/(?<![\w.])goto\(/g)]
				.filter((call) => {
					const open = call.index + call[0].length - 1;
					const after = body.slice(closingParen(body, open) + 1).trimStart();
					const before = body.slice(0, call.index);
					return !/await\s+$/.test(before) && !/^\.(catch|then)\(/.test(after);
				})
				.map((call) => `${name}: ${body.slice(call.index, call.index + 70).split('\n')[0]}`)
		);
		expect(floating).toEqual([]);
	});
});

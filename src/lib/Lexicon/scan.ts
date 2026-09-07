import { parse } from 'svelte/compiler';

/**
 * Where a lexicon term appears in the prose of a page.
 *
 * The term and the page, plus the line, so the report is something you can
 * click. `section` is the block the occurrence is grouped under — see
 * sectionOf — and `linked` says the term was already spoken for there.
 */
export interface Occurrence {
	term: string;
	/** The text actually matched: the term itself, or one of its synonyms. */
	matched: string;
	line: number;
	column: number;
	section: string;
	linked: boolean;
}

/**
 * Elements whose text is not plain prose, and must not gain a marker.
 *
 * A term inside a link or a button is already doing something when clicked,
 * and a second control nested in it is both invalid HTML and a trap for the
 * reader. Headings are excluded on editorial grounds rather than technical
 * ones: a "?" in a heading reads as uncertainty about the title itself.
 *
 * Def is here because a term already carrying a definition is the state we
 * are trying to reach — finding one is success, not a finding.
 */
const OPAQUE_ELEMENTS = new Set([
	'a',
	'button',
	'code',
	'pre',
	'kbd',
	'samp',
	'abbr',
	'dfn',
	'title',
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',
	'Def'
]);

/**
 * A term matches only as a whole word.
 *
 * Spelled out rather than using \b, which is defined on [A-Za-z0-9_] and so
 * treats the accented letters of "Équipe" as word boundaries — exactly wrong
 * for French. An apostrophe or a hyphen does end a word, so "l'ESP" and
 * "inter-MSP" both match, while "MSPs" does not.
 */
const WORD_EDGE = '[^\\p{L}\\p{N}]';

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const matcher = (label: string) =>
	new RegExp(`(?<=^|${WORD_EDGE})${escapeRegExp(label)}(?=$|${WORD_EDGE})`, 'gu');

export interface LexiconEntry {
	/** The canonical label, as the lexique page lists it. */
	term: string;
	/** Every spelling that should carry the definition, the term included. */
	labels: string[];
}

/**
 * Which block an occurrence belongs to, for the "first per section" rule.
 *
 * The nearest ancestor that reads as a section to a visitor: an explicit
 * <section>, or the space-y-* div that the programme pages use to group a
 * heading with its paragraphs. A page with no such structure falls back to one
 * marker for the whole page, which is the quiet end of the rule.
 */
const sectionOf = (ancestors: readonly string[]): string => {
	for (let i = ancestors.length - 1; i >= 0; i--) {
		if (ancestors[i].startsWith('section:')) return ancestors.slice(0, i + 1).join('>');
	}
	return 'page';
};

const lineAt = (source: string, offset: number) => {
	const before = source.slice(0, offset);
	return {
		line: before.split('\n').length,
		column: offset - (before.lastIndexOf('\n') + 1) + 1
	};
};

/**
 * Find every lexicon term in the prose of one Svelte page.
 *
 * Parsed rather than grepped. A page is full of text that looks like prose and
 * is not: an attribute value, a URL, a class list, the whole of the <script>.
 * A regex over the source cannot tell those apart, and wrapping one of them
 * silently corrupts the page — so the AST decides what counts as prose and the
 * regex only ever runs on what it hands over.
 */
export const scanSource = (source: string, lexicon: LexiconEntry[]): Occurrence[] => {
	// Only the template is walked: ast.instance and ast.module are the <script>
	// blocks, which never reach the reader as prose.
	const ast = parse(source, { modern: true });
	const found: Occurrence[] = [];

	// The AST is a graph, not a tree: some nodes are reachable by more than one
	// path, and a few pages nest deeply enough that revisiting them exhausts the
	// stack. Visiting each object once also stops one occurrence being counted
	// twice because it was reached twice.
	const seen = new WeakSet<object>();

	const visit = (node: any, ancestors: string[], inAttribute: boolean, inOpaque: boolean) => {
		if (!node || typeof node !== 'object') return;
		if (seen.has(node)) return;
		seen.add(node);

		if (node.type === 'Text' && typeof node.data === 'string') {
			// Attribute values are markup, not prose — including the w="MSP" of an
			// existing Def, which would otherwise report itself as unlinked.
			if (!inAttribute && node.data.trim()) {
				const section = sectionOf(ancestors);
				for (const entry of lexicon) {
					for (const label of entry.labels) {
						for (const hit of node.data.matchAll(matcher(label))) {
							const { line, column } = lineAt(source, node.start + (hit.index ?? 0));
							found.push({
								term: entry.term,
								matched: label,
								line,
								column,
								section,
								linked: inOpaque
							});
						}
					}
				}
			}
			return;
		}

		const name: string | undefined = node.name;
		const isElement =
			node.type === 'RegularElement' ||
			node.type === 'Component' ||
			node.type === 'SvelteElement';
		const nowOpaque = inOpaque || (isElement && !!name && OPAQUE_ELEMENTS.has(name));

		// Tagged with the node's own offset so two sibling sections are two
		// sections, not one repeated name.
		let label = name ?? node.type;
		if (isElement && name) {
			const classAttribute = (node.attributes ?? []).find((a: any) => a.name === 'class');
			// A value is an array of chunks for a literal, but `true` for a
			// shorthand and an expression node for class={x} — only the literal
			// chunks can be read as text.
			const chunks = Array.isArray(classAttribute?.value) ? classAttribute.value : [];
			const classText = chunks
				.filter((v: any) => v.type === 'Text')
				.map((v: any) => v.data)
				.join(' ');
			if (name === 'section' || /\bspace-y-/.test(classText)) {
				label = `section:${name}@${node.start}`;
			}
		}
		const nextAncestors = isElement && name ? [...ancestors, label] : ancestors;

		for (const key of Object.keys(node)) {
			if (key === 'parent') continue;
			const value = node[key];
			const attribute = inAttribute || key === 'attributes';
			if (Array.isArray(value)) {
				for (const child of value) visit(child, nextAncestors, attribute, nowOpaque);
			} else if (value && typeof value === 'object') {
				visit(value, nextAncestors, attribute, nowOpaque);
			}
		}
	};

	visit(ast.fragment, [], false, false);
	return found;
};

/**
 * The occurrences that ought to carry a definition: one per term per section.
 *
 * Everything after the first in a section is prose the reader has already had
 * explained — marking all eight mentions of MSP on a page would be noise
 * rather than help. An occurrence inside a link or a heading is never the one
 * asked to carry the marker, but it does satisfy its section: the reader
 * already has somewhere to go from there.
 */
export const unlinkedOccurrences = (occurrences: Occurrence[]): Occurrence[] => {
	const claimed = new Set<string>();
	const result: Occurrence[] = [];
	for (const occurrence of occurrences) {
		const key = `${occurrence.term} ${occurrence.section}`;
		if (claimed.has(key)) continue;
		claimed.add(key);
		if (!occurrence.linked) result.push(occurrence);
	}
	return result;
};

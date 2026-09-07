import { describe, it, expect } from 'vitest';
import { readFileSync, globSync } from 'node:fs';
import { relative } from 'node:path';
import { scanSource, unlinkedOccurrences, type Occurrence } from './scan';
import { lexiconEntries } from './lexicon';

const ROOT = new URL('../../..', import.meta.url).pathname;

/**
 * Pages a reader actually reads.
 *
 * The lexique page itself is excluded: it lists every term by definition, and
 * a definition does not need a popup explaining it.
 */
const pages = globSync('src/routes/**/+page.svelte', { cwd: ROOT }).filter(
	(p) => !p.includes('lexique')
);

interface Finding extends Occurrence {
	page: string;
}

const findings: Finding[] = [];
const lexicon = lexiconEntries();

for (const page of pages) {
	let source: string;
	try {
		source = readFileSync(`${ROOT}/${page}`, 'utf8');
	} catch {
		continue;
	}
	let occurrences: Occurrence[];
	try {
		occurrences = scanSource(source, lexicon);
	} catch (error: any) {
		// A page this parser cannot read is a gap in the tool, not a finding
		// about the page. Reported by the test below rather than silently
		// counted as clean.
		findings.push({
			page,
			term: '(unparseable)',
			matched: String(error?.message ?? error).split('\n')[0],
			line: 0,
			column: 0,
			section: '',
			linked: false
		});
		continue;
	}
	for (const occurrence of unlinkedOccurrences(occurrences)) findings.push({ page, ...occurrence });
}

/**
 * How much of the lexicon is actually reaching readers.
 *
 * This is a report, not a gate: it prints what it finds and does not fail the
 * suite. Coverage today is poor by design of the old workflow — every link was
 * placed by hand, so a term explained on one page is plain text on the next —
 * and a red suite would say "someone wrote a page" rather than "someone made a
 * mistake". Turning it into a gate is worth doing once coverage is deliberate.
 */
describe('lexicon coverage across the site', () => {
	it('reports terms that appear in prose without a definition', () => {
		const byPage = new Map<string, Finding[]>();
		for (const finding of findings) {
			if (!byPage.has(finding.page)) byPage.set(finding.page, []);
			byPage.get(finding.page)!.push(finding);
		}

		const lines: string[] = [
			`Lexicon: ${lexicon.length} terms, ${lexicon.reduce((n, e) => n + e.labels.length, 0)} spellings`,
			`Scanned: ${pages.length} pages`,
			`Unlinked: ${findings.length} occurrences across ${byPage.size} pages`,
			''
		];
		for (const [page, pageFindings] of [...byPage].sort()) {
			lines.push(relative('src/routes', page));
			for (const finding of pageFindings) {
				lines.push(`  ${finding.line}:${finding.column}  ${finding.matched}`);
			}
		}
		console.log(lines.join('\n'));

		// The scan itself must work: every page parses, and the lexicon loaded.
		expect(lexicon.length).toBeGreaterThan(0);
		expect(findings.filter((f) => f.term === '(unparseable)')).toEqual([]);
	});
});

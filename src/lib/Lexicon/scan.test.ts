import { describe, it, expect } from 'vitest';
import { scanSource, unlinkedOccurrences, type LexiconEntry } from './scan';

const lexicon: LexiconEntry[] = [
	{ term: 'MSP', labels: ['MSP', 'Maison de santé pluriprofessionnelle'] },
	{ term: 'ESP', labels: ['ESP', 'Équipe de soins primaires'] },
	{ term: 'PULM', labels: ['PULM', 'Psychiatrie Universitaire Lyon Métropole'] }
];

const unlinked = (source: string) =>
	unlinkedOccurrences(scanSource(source, lexicon)).map((o) => `${o.term}:${o.line}`);

/**
 * The scan reads the page the way a visitor does.
 *
 * Everything here is a case a regex over the raw source gets wrong. They are
 * the reason this is parsed rather than grepped: a wrong match does not just
 * produce a bad report, it is a page corrupted by --fix later on.
 */
describe('what counts as prose', () => {
	it('finds a term in a paragraph', () => {
		expect(unlinked('<p>Une MSP de proximité.</p>')).toEqual(['MSP:1']);
	});

	it('ignores the script block', () => {
		const source = ['<script>const label = "MSP";</' + 'script>', '<p>Rien ici.</p>'].join('\n');
		expect(unlinked(source)).toEqual([]);
	});

	it('ignores an attribute value', () => {
		expect(unlinked('<p><img alt="MSP" src="/x.png" /> Rien.</p>')).toEqual([]);
	});

	it('ignores a URL that contains the term', () => {
		expect(unlinked('<p><a href="/maison-de-sante/MSP">Notre maison</a></p>')).toEqual([]);
	});

	it('ignores a class list that contains the term', () => {
		expect(unlinked('<p class="MSP-header">Rien.</p>')).toEqual([]);
	});

	it('ignores a term inside a link, which is already a control', () => {
		expect(unlinked('<p>Voir <a href="/x">la MSP</a>.</p>')).toEqual([]);
	});

	it('ignores a term in a heading', () => {
		expect(unlinked('<h2>Notre MSP</h2>')).toEqual([]);
	});

	it('ignores a term already carrying a definition', () => {
		expect(unlinked('<p>Une <Def w="MSP" /> de proximité.</p>')).toEqual([]);
	});
});

/**
 * French words, not \b: the pattern has to hold for accented letters and for
 * the elided article, both of which are everywhere in this prose.
 */
describe('what counts as a word', () => {
	it('does not match inside a longer word', () => {
		expect(unlinked('<p>Les MSPs du secteur.</p>')).toEqual([]);
	});

	it('matches after an elided article', () => {
		expect(unlinked("<p>L'ESP du quartier.</p>")).toEqual(['ESP:1']);
	});

	it('matches either side of a hyphen', () => {
		expect(unlinked('<p>Une réunion inter-MSP.</p>')).toEqual(['MSP:1']);
	});

	it('matches an accented multi-word term', () => {
		expect(unlinked('<p>Une Équipe de soins primaires du secteur.</p>')).toEqual(['ESP:1']);
	});

	it('reports which spelling was matched, not just the term', () => {
		const [occurrence] = unlinkedOccurrences(
			scanSource('<p>Le Psychiatrie Universitaire Lyon Métropole.</p>', lexicon)
		);
		expect(occurrence.term).toBe('PULM');
		expect(occurrence.matched).toBe('Psychiatrie Universitaire Lyon Métropole');
	});
});

/**
 * One marker per term per section.
 *
 * Eight mentions of MSP on a page is eight chances to explain it and one
 * moment where the reader wants it. A long page still re-offers the definition
 * further down, because each section stands on its own.
 */
describe('how often a term is worth marking', () => {
	it('marks the first occurrence only, within one section', () => {
		const source = ['<section>', '<p>Une MSP.</p>', '<p>Encore une MSP.</p>', '</section>'].join(
			'\n'
		);
		expect(unlinked(source)).toEqual(['MSP:2']);
	});

	it('marks it again in the next section', () => {
		const source = [
			'<section><p>Une MSP.</p></section>',
			'<section><p>Encore une MSP.</p></section>'
		].join('\n');
		expect(unlinked(source)).toEqual(['MSP:1', 'MSP:2']);
	});

	it('treats a space-y block as a section, as the programme pages do', () => {
		const source = [
			'<div class="space-y-4"><p>Une MSP.</p></div>',
			'<div class="space-y-4"><p>Encore une MSP.</p></div>'
		].join('\n');
		expect(unlinked(source)).toEqual(['MSP:1', 'MSP:2']);
	});

	it('keeps two terms in one section apart', () => {
		expect(unlinked('<section><p>Une MSP et une ESP.</p></section>')).toEqual(['MSP:1', 'ESP:1']);
	});

	// The reader already has somewhere to go from this section, so asking for a
	// second marker below the link would be repeating an answer they have.
	it('counts a linked mention as satisfying its section', () => {
		const source = [
			'<section>',
			'<p>Voir <a href="/x">la MSP</a>.</p>',
			'<p>Encore une MSP.</p>',
			'</section>'
		].join('\n');
		expect(unlinked(source)).toEqual([]);
	});
});

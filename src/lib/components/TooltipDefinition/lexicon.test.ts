import { describe, it, expect } from 'vitest';
import dict, { resolve, type Lexicon } from './lexicon';

const lexicon: Lexicon = {
	MSP: ['Maison de santé pluriprofessionnelle'],
	'Maison de santé pluriprofessionnelle': ['Une structure pluridisciplinaire.', 'Un second para.'],
	RCP: ['Une réunion mensuelle.']
};

/**
 * A synonym is a key whose definition is another key.
 *
 * The lookup that followed it was `dict[w] in dict` — an array tested as a key,
 * so always false. The synonym branch of Def.svelte had therefore never run:
 * a reader clicking "MSP" got the *name* it expands to where the definition
 * should be, and the "en savoir plus" link went to an anchor built from that
 * name rather than the term. Typing the lexicon is what surfaced it.
 */
describe('resolving a term to the entry that holds its text', () => {
	it('follows a synonym to its target', () => {
		expect(resolve('MSP', lexicon)).toEqual({
			term: 'Maison de santé pluriprofessionnelle',
			definition: ['Une structure pluridisciplinaire.', 'Un second para.']
		});
	});

	it('resolves a term that holds its own text to itself', () => {
		expect(resolve('RCP', lexicon)).toEqual({
			term: 'RCP',
			definition: ['Une réunion mensuelle.']
		});
	});

	// Def renders nothing rather than throwing: a term absent from the lexicon
	// is a page that named one it does not have, and a missing popup is a
	// better failure than a broken page.
	it('gives nothing for a term it does not know', () => {
		expect(resolve('INCONNU', lexicon)).toBeUndefined();
	});

	// Two synonyms pointing at each other would loop forever if the resolution
	// followed a chain. One hop cannot: a synonym of a synonym is a data
	// mistake, and it stops rather than hanging the page.
	it('follows one hop only, so a cycle cannot hang it', () => {
		const cyclic: Lexicon = { A: ['B'], B: ['A'] };
		expect(resolve('A', cyclic)).toEqual({ term: 'B', definition: ['A'] });
	});
});

/**
 * The shipped lexicon has to satisfy what Def assumes of it, or the component
 * renders a name where a definition belongs — which is exactly the bug above.
 */
describe('the lexicon as shipped', () => {
	it('resolves every term to a real definition', () => {
		for (const term of Object.keys(dict)) {
			const entry = resolve(term);
			expect(entry, term).toBeDefined();
			// A definition, not another key: one hop has to be enough.
			expect(entry!.definition[0] in dict, `${term} resolves to a definition`).toBe(false);
		}
	});
});

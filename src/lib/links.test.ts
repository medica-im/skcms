import { describe, it, expect } from 'vitest';
import { getProgram, getIsOther, programCount } from './links';
import type { ProgramsNavLinks } from './interfaces/variables.interface';

// A site keeps a route it has not filled in yet: the folder exists and is
// served, but the page is deliberately absent from programsNavLinks. This is
// the santelyon3 case — education-sante and education-therapeutique are kept
// for future content, while polypathologie (a gadagne program) was removed.
const programsNavLinks = {
	prevention: {
		id: 'prevention',
		title: { en: 'Health prevention', fr: 'Prévention' },
		href: '/prevention',
		list: [
			{ href: '/prevention/vaccins', label: 'Vaccins', category: 'program', active: true },
			{ href: '/prevention/canicule', label: 'Canicule', category: 'program', active: true }
		]
	},
	'parcours-pluriprofessionnels': {
		id: 'pathways',
		title: { en: 'Multi-professional pathways', fr: 'Parcours pluriprofessionnels' },
		href: '/parcours-pluriprofessionnels',
		list: [
			{
				href: '/parcours-pluriprofessionnels/sante-mentale',
				label: 'Santé mentale',
				category: 'program',
				active: true
			}
		]
	}
} as unknown as ProgramsNavLinks;

describe('an unlisted route', () => {
	// Throwing here 500s a page that renders fine otherwise: ProgramNav is a
	// footer-level "see also", never the reason the page exists.
	it('yields no sibling programs instead of throwing', () => {
		expect(() => getProgram('/education-sante', programsNavLinks)).not.toThrow();
		expect(getProgram('/education-sante', programsNavLinks).list).toEqual([]);
	});

	it('is not an "other" program', () => {
		expect(() => getIsOther('/education-sante', programsNavLinks)).not.toThrow();
		expect(getIsOther('/education-sante', programsNavLinks)).toBe(false);
	});

	it('counts zero programs', () => {
		expect(() => programCount('/education-sante', programsNavLinks)).not.toThrow();
		expect(programCount('/education-sante', programsNavLinks)).toBe(0);
	});
});

describe('a listed route', () => {
	it('still lists its active sibling programs', () => {
		const program = getProgram('/prevention/vaccins', programsNavLinks);
		expect(program.id).toBe('prevention');
		expect(program.list.map((e) => e.href)).toEqual(['/prevention/canicule']);
	});

	it('still counts its programs', () => {
		expect(programCount('/prevention', programsNavLinks)).toBe(2);
	});

	it('still recognises one of its programs as "other"', () => {
		expect(getIsOther('/prevention/vaccins', programsNavLinks)).toBe(true);
	});
});

/**
 * A sub-page is inside its programme, not beside it.
 *
 * ProgramNav offers the reader the *other* programmes of the category. On a
 * programme page that works by exact match: the page filters itself out and
 * what remains is its siblings. A sub-page's URL matches nothing, so the
 * programme it belongs to survived the filter and the card offered a link back
 * into the page the reader was already inside — "Notre programme de parcours
 * pluriprofessionnels : Santé mentale", at the foot of a Santé mentale
 * sub-page.
 *
 * The rule is about containment, not about a list of known sub-pages: any path
 * under a programme's href belongs to that programme, so no route has to be
 * registered anywhere for this to hold. It follows the breadcrumb, which
 * already treats such a path as sitting under that programme.
 */
describe('a sub-page of a programme', () => {
	const subPage = '/parcours-pluriprofessionnels/sante-mentale/tele-expertise';

	it('does not offer the programme it belongs to', () => {
		const program = getProgram(subPage, programsNavLinks);
		expect(program.list.map((e) => e.href)).not.toContain(
			'/parcours-pluriprofessionnels/sante-mentale'
		);
	});

	// The only programme in this category is the one above it, so there is
	// nothing left to show and ProgramNav draws no card at all.
	it('shows no card when its programme was the only one', () => {
		expect(getProgram(subPage, programsNavLinks).list).toEqual([]);
	});

	// "Notre autre programme", the same wording a programme page gets: the
	// reader is inside a programme either way.
	it('counts as being on a programme, so the others are "other"', () => {
		expect(getIsOther(subPage, programsNavLinks)).toBe(true);
	});

	// A sibling programme is still a sibling from inside a sub-page: the rule
	// removes the parent, not the rest of the category.
	it('still offers the sibling programmes of its category', () => {
		const program = getProgram('/prevention/vaccins/calendrier', programsNavLinks);
		expect(program.list.map((e) => e.href)).toEqual(['/prevention/canicule']);
	});
});

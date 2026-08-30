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

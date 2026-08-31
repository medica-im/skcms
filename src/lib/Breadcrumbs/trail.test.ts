import { describe, it, expect } from 'vitest';
import { programTrail } from './trail';
import type { ProgramsNavLinks } from '$lib/interfaces/variables.interface';

const programsNavLinks = {
	'acces-aux-soins': {
		id: 'healthcareAccess',
		title: { en: 'Healthcare access', fr: 'Accès aux soins' },
		href: '/acces-aux-soins',
		list: [
			{ href: '/acces-aux-soins/medecin-traitant', label: 'Médecin traitant', category: 'program', active: true },
			{ href: '/acces-aux-soins/soins-non-programmes', label: 'Soins non programmés', category: 'program', active: true }
		]
	},
	prevention: {
		id: 'prevention',
		title: { en: 'Health prevention', fr: 'Prévention en santé' },
		href: '/prevention',
		list: [{ href: '/prevention/vaccins', label: 'Vaccins', category: 'program', active: true }]
	}
} as unknown as ProgramsNavLinks;

/**
 * The trail is derived from the nav data, never written per page.
 *
 * That is what keeps it honest: a page renamed in variables.ts is renamed in
 * the breadcrumb at the same moment, and a page the nav data does not know
 * about simply stops the trail rather than showing a stale label.
 */
describe('the programme breadcrumb trail', () => {
	it('is just home on a page outside the programmes', () => {
		expect(programTrail('/contact', programsNavLinks)).toEqual([{ label: 'Accueil', href: '/', current: false }]);
	});

	it('names the category on a category landing page', () => {
		expect(programTrail('/prevention', programsNavLinks)).toEqual([
			{ label: 'Accueil', href: '/', current: false },
			{ label: 'Prévention en santé', href: '/prevention', current: true }
		]);
	});

	it('names category then programme on a programme page', () => {
		expect(programTrail('/acces-aux-soins/medecin-traitant', programsNavLinks)).toEqual([
			{ label: 'Accueil', href: '/', current: false },
			{ label: 'Accès aux soins', href: '/acces-aux-soins', current: false },
			{ label: 'Médecin traitant', href: '/acces-aux-soins/medecin-traitant', current: true }
		]);
	});

	// calendrier and annuaire are real routes but are not in programsNavLinks;
	// the page's own h1 says where the reader is, so the trail stops at the
	// deepest level it can name rather than inventing one.
	it('stops at the deepest level the nav data knows', () => {
		expect(programTrail('/prevention/vaccins/calendrier', programsNavLinks)).toEqual([
			{ label: 'Accueil', href: '/', current: false },
			{ label: 'Prévention en santé', href: '/prevention', current: false },
			{ label: 'Vaccins', href: '/prevention/vaccins', current: false }
		]);
	});

	it('ignores a query string', () => {
		expect(programTrail('/prevention?tab=x', programsNavLinks).at(-1)?.href).toBe('/prevention');
	});

	it('survives an unknown category without throwing', () => {
		expect(() => programTrail('/nowhere/at-all', programsNavLinks)).not.toThrow();
		expect(programTrail('/nowhere/at-all', programsNavLinks)).toEqual([
			{ label: 'Accueil', href: '/', current: false }
		]);
	});
});

describe('which crumb is the page you are on', () => {
	// On a sub-page the trail stops at the programme above it, so that last
	// crumb is a parent and has to stay clickable — it is the way back up.
	it('marks no crumb as current on a sub-page', () => {
		const trail = programTrail('/prevention/vaccins/calendrier', programsNavLinks);
		expect(trail.at(-1)).toEqual({ label: 'Vaccins', href: '/prevention/vaccins', current: false });
	});

	it('marks the last crumb as current on a programme page', () => {
		const trail = programTrail('/prevention/vaccins', programsNavLinks);
		expect(trail.at(-1)?.current).toBe(true);
	});

	it('marks the last crumb as current on a category page', () => {
		const trail = programTrail('/prevention', programsNavLinks);
		expect(trail.at(-1)?.current).toBe(true);
	});
});

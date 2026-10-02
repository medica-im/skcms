/**
 * How a facility reads in the entry creation form's facility select.
 *
 * Name first, because that is what the person picking is looking for; then
 * where it is, from the most to the least precise: street, commune,
 * département. Once the user has narrowed the list to a département or a
 * commune, repeating it on every line is noise, so it is left out.
 *
 * Search matches the displayed string and the facility's label, which is
 * often how people know a place ("Cabinet du Moulin") when its name is
 * something else.
 */
import { describe, it, expect } from 'vitest';
import { facilityMatches, facilityOptionLabel, facilitySearchText } from './facilityOption';
import type { FacilityV2 } from '$lib/interfaces/v2/facility.ts';

const facility = (overrides: Partial<FacilityV2> = {}): FacilityV2 =>
	({
		uid: 'f1',
		name: 'Maison de santé du Parc',
		label: 'MSP du Parc',
		street: '12 rue de la République',
		commune: {
			uid: 'c1',
			name_fr: 'Lyon',
			department: { code: '69', name: 'Rhône' }
		},
		effectors: null,
		...overrides
	}) as FacilityV2;

describe('facilityOptionLabel', () => {
	it('reads name, street, commune, département', () => {
		expect(facilityOptionLabel(facility())).toBe(
			'Maison de santé du Parc, 12 rue de la République, Lyon, Rhône'
		);
	});

	it('leaves out the département once one is selected', () => {
		expect(facilityOptionLabel(facility(), { department: true })).toBe(
			'Maison de santé du Parc, 12 rue de la République, Lyon'
		);
	});

	it('leaves out the commune and the département once a commune is selected', () => {
		expect(facilityOptionLabel(facility(), { department: true, commune: true })).toBe(
			'Maison de santé du Parc, 12 rue de la République'
		);
	});

	it('skips an empty street rather than leaving a gap', () => {
		expect(facilityOptionLabel(facility({ street: '' }))).toBe('Maison de santé du Parc, Lyon, Rhône');
		expect(facilityOptionLabel(facility({ street: null as unknown as string }))).toBe(
			'Maison de santé du Parc, Lyon, Rhône'
		);
	});

	it('trims the stray spaces names and streets come with', () => {
		expect(facilityOptionLabel(facility({ name: 'CH Guillaume Regnier ', street: ' Bd Leclerc ' }))).toBe(
			'CH Guillaume Regnier, Bd Leclerc, Lyon, Rhône'
		);
	});

	it('never shows a uid: no name, no people, it falls back on the label, then on the address', () => {
		expect(facilityOptionLabel(facility({ name: null, effectors: null }))).toBe(
			'MSP du Parc, 12 rue de la République, Lyon, Rhône'
		);
		expect(facilityOptionLabel(facility({ name: '  ', effectors: [], label: null }))).toBe(
			'12 rue de la République, Lyon, Rhône'
		);
	});

	it('names an unnamed facility by the people working there', () => {
		expect(facilityOptionLabel(facility({ name: null, effectors: ['Ana Dupont (IPA)'] }))).toBe(
			'1 effecteur: Ana Dupont (IPA), 12 rue de la République, Lyon, Rhône'
		);
	});
});

describe('facilitySearchText', () => {
	it('adds the label to what is displayed', () => {
		const f = facility();
		expect(facilitySearchText(f, facilityOptionLabel(f))).toBe(
			'Maison de santé du Parc, 12 rue de la République, Lyon, Rhône MSP du Parc'
		);
	});

	it('is the displayed string alone when there is no label', () => {
		const f = facility({ label: null });
		expect(facilitySearchText(f, 'shown')).toBe('shown');
	});
});

/**
 * Search is per word, not one substring: the label is appended after the
 * displayed string, so "msp lyon" (label, then commune) would never be one
 * substring of it. Every word typed must appear somewhere, in any order.
 *
 * People type the way they say a place: without accents or capitals, with a
 * space where the name has a hyphen or an apostrophe, and a word at a time —
 * each keystroke filters, so a half-typed word has to match already.
 */
describe('facilityMatches', () => {
	const f = facility({
		name: "L'Hôpital Saint-Étienne",
		label: 'CHU Nord',
		street: '12 rue de la République',
		commune: { uid: 'c1', name_fr: 'Lyon', department: { code: '69', name: 'Rhône' } } as FacilityV2['commune']
	});
	const text = facilitySearchText(f, facilityOptionLabel(f));
	const matches = (query: string) => facilityMatches(text, query);

	it('matches everything while nothing is typed', () => {
		expect(matches('')).toBe(true);
		expect(matches('   ')).toBe(true);
	});

	it('ignores case and accents', () => {
		expect(matches('REPUBLIQUE')).toBe(true);
		expect(matches('rhone')).toBe(true);
		expect(matches('hôpital')).toBe(true);
	});

	it('matches the label, which is not displayed', () => {
		expect(matches('chu nord')).toBe(true);
	});

	it('matches words from different parts, in any order', () => {
		expect(matches('lyon chu')).toBe(true);
		expect(matches('chu république lyon')).toBe(true);
	});

	it('needs every word to match', () => {
		expect(matches('lyon marseille')).toBe(false);
		expect(matches('chu sud')).toBe(false);
	});

	it('matches a word as it is being typed', () => {
		expect(matches('repub')).toBe(true);
		expect(matches('saint-e')).toBe(true);
	});

	it('treats hyphens and spaces alike, both ways', () => {
		expect(matches('saint etienne')).toBe(true);
		expect(matches('saint-etienne')).toBe(true);
		const spaced = facility({ name: 'Saint Étienne', label: null });
		expect(facilityMatches(facilitySearchText(spaced, facilityOptionLabel(spaced)), 'saint-étienne')).toBe(true);
	});

	it('treats apostrophes, straight or curly, as a space', () => {
		expect(matches('hopital')).toBe(true);
		expect(matches("l'hopital")).toBe(true);
		expect(matches('l’hopital')).toBe(true);
	});

	it('matches numbers in the street', () => {
		expect(matches('12 rue')).toBe(true);
		expect(matches('13 rue')).toBe(false);
	});
});

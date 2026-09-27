/**
 * What an entry page tells browsers and search engines about itself: its
 * canonical address, its title and its description.
 *
 * The canonical is built from the PUBLIC origin and the base path. It used to
 * be built from the backend's address, so every entry page on unipa.fr/annuaire
 * declared https://ipa.medica.im/e/<slug> as its real address -- another host,
 * missing the base path, answering with a redirect.
 *
 * The title is what a browser tab and a search result headline show, so it is
 * short and starts with who: the name, the short occupation, the commune. The
 * commune is what tells apart the entries of one person working in two places.
 * The description carries the full occupation and the facility.
 */
import { describe, it, expect } from 'vitest';
import { entryCanonicalUrl, entryDescription, entryTitle } from './entryMeta';

const pischedda = {
	name: 'PISCHEDDA Laetitia',
	effector_type: {
		label: 'infirmière en pratique avancée',
		name: 'infirmier en pratique avancée',
		raw_label: 'IPA'
	},
	facility: { name: 'Hôpital privé Claude Galien' },
	address: { city: 'Quincy-sous-Sénart' },
	department: { code: '91' }
};

const generalist = {
	name: 'DUPONT Jean',
	effector_type: { label: 'médecin généraliste', name: 'médecin généraliste', raw_label: null },
	facility: { name: 'Maison de santé des Pentes' },
	address: { city: 'Lyon' },
	department: { code: '69' }
};

describe('entryCanonicalUrl', () => {
	it('is the public address under the base path', () => {
		expect(entryCanonicalUrl('https://unipa.fr', '/annuaire', 'pischedda-laetitia-ipa-91')).toBe(
			'https://unipa.fr/annuaire/e/pischedda-laetitia-ipa-91'
		);
	});

	it('is at the root of a site served at its root', () => {
		expect(entryCanonicalUrl('https://santelyon3.fr', '', 'x-69')).toBe('https://santelyon3.fr/e/x-69');
	});
});

describe('entryTitle', () => {
	it('names the person, the short occupation and the commune', () => {
		expect(entryTitle(pischedda)).toBe('PISCHEDDA Laetitia, IPA à Quincy-sous-Sénart');
	});

	// The directory's own rule (buttonLabel): only an acronym may stand in for
	// the gendered label.
	it('uses the full occupation when it has no acronym', () => {
		expect(entryTitle(generalist)).toBe('DUPONT Jean, médecin généraliste à Lyon');
	});

	// EffectorType.label is nullable; its name is the ungendered form.
	it("falls back to the type's name when it has no label", () => {
		const unlabelled = { ...generalist, effector_type: { label: null, name: 'médecin généraliste', raw_label: null } };
		expect(entryTitle(unlabelled)).toBe('DUPONT Jean, médecin généraliste à Lyon');
		expect(entryDescription(unlabelled)).toMatch(/^DUPONT Jean, médecin généraliste — /);
	});

	it('leaves the commune out when the entry has no address', () => {
		const nowhere = { ...pischedda, address: null };
		expect(entryTitle(nowhere)).toBe('PISCHEDDA Laetitia, IPA');
	});

	it('tells apart two entries of one person working in two places', () => {
		const elsewhere = { ...pischedda, address: { city: 'Épinay-sous-Sénart' } };
		expect(entryTitle(elsewhere)).not.toBe(entryTitle(pischedda));
	});
});

describe('entryDescription', () => {
	it('carries the full occupation, the facility, the commune and the department', () => {
		expect(entryDescription(pischedda)).toBe(
			'PISCHEDDA Laetitia, infirmière en pratique avancée — Hôpital privé Claude Galien, Quincy-sous-Sénart (91).'
		);
	});

	it('leaves out what the entry does not have', () => {
		const bare = { ...pischedda, facility: null, department: null };
		expect(entryDescription(bare)).toBe(
			'PISCHEDDA Laetitia, infirmière en pratique avancée — Quincy-sous-Sénart.'
		);
	});

	it('ends after the occupation when there is no place at all', () => {
		const bare = { ...pischedda, facility: null, address: null, department: null };
		expect(entryDescription(bare)).toBe('PISCHEDDA Laetitia, infirmière en pratique avancée.');
	});
});

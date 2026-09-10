/**
 * What the address book must keep doing.
 *
 * These are not tests of the current implementation — they are the record of
 * its behaviour, written so a differently-shaped implementation on a newer
 * Svelte can be held to the same standard. Everything goes through
 * `directoryView`; no filter function is named. If a rewrite makes this file
 * fail, the rewrite changed what users see.
 *
 * Every selector is covered on its own and in combination, including the ones
 * no live site currently displays (tags, facility, currentOrg, limitCategories).
 * The code paths exist for all of them, a rewrite can break one that is merely
 * hidden today, and the damage would only appear when a site enables it later.
 *
 * Assertions are on names and order, never counts: a count that happens to
 * match is not evidence the right people are on screen.
 */
import { describe, it, expect } from 'vitest';
import { directoryView, visibleNames, groupNames } from './directoryView.ts';
import {
	directoryEntries,
	directorySituations,
	SITUATION_URGENT,
	SITUATION_EMPTY,
	organization,
	NURSE,
	DOCTOR,
	PHYSIO,
	TAG_ONCO,
	TAG_GERIA,
	TAG_SPORT,
	GADAGNE,
	AVIGNON,
	NIMES,
	MSP_A,
	CABINET_B,
	CENTRE_C
} from './directoryStore.fixtures.ts';

const directory = {
	entries: directoryEntries,
	situations: directorySituations,
	organization
};

/** The eight active entries, alphabetical — the baseline every filter narrows. */
const ALL_ACTIVE = [
	'Alice Martin',
	'Bruno Lopez',
	'Chloé Nguyen',
	'Damien Roux',
	'Élodie Barre',
	'Farid Benali',
	'Gaëlle Petit',
	'Hugo Marchand'
];

const view = (selections = {}) => directoryView(directory, selections);

/**
 * Names in French collation order. Plain `.sort()` is code-unit order, which
 * puts "Élodie" after "Hugo" — a comparison detail of the test, nothing the
 * address book does, so both sides of every assertion use this.
 */
const byName = (a: string, b: string) => a.localeCompare(b, 'fr');
const sorted = (xs: string[]) => [...xs].sort(byName);
const names = (selections = {}) => sorted(visibleNames(view(selections)));

describe('the unfiltered address book', () => {
	it('shows every active entry', () => {
		expect(names()).toEqual(ALL_ACTIVE);
	});

	it('hides inactive entries by default', () => {
		expect(names()).not.toContain('Inès Fabre');
		expect(names()).not.toContain('Jean Ferrand');
	});

	it('shows only inactive entries when asked for them', () => {
		expect(names({ active: false })).toEqual(['Inès Fabre', 'Jean Ferrand']);
	});

	it('shows active and inactive together when active is null', () => {
		expect(names({ active: null })).toEqual(
			sorted([...ALL_ACTIVE, 'Inès Fabre', 'Jean Ferrand'])
		);
	});
});

describe('each selector on its own', () => {
	it('category keeps only that effector type', () => {
		expect(names({ categories: [NURSE.uid] })).toEqual([
			'Alice Martin',
			'Bruno Lopez',
			'Farid Benali'
		]);
	});

	it('category accepts several types at once, as a union', () => {
		expect(names({ categories: [DOCTOR.uid, PHYSIO.uid] })).toEqual([
			'Chloé Nguyen',
			'Damien Roux',
			'Gaëlle Petit',
			'Hugo Marchand',
			'Élodie Barre'
		].sort(byName));
	});

	it('department keeps only that department code', () => {
		expect(names({ department: { label: 'Gard', value: '30' } })).toEqual([
			'Gaëlle Petit',
			'Hugo Marchand'
		]);
	});

	it('commune keeps only that commune', () => {
		expect(names({ communes: [GADAGNE.uid] })).toEqual([
			'Alice Martin',
			'Bruno Lopez',
			'Chloé Nguyen'
		]);
	});

	it('commune accepts several at once, as a union', () => {
		expect(names({ communes: [GADAGNE.uid, NIMES.uid] })).toEqual([
			'Alice Martin',
			'Bruno Lopez',
			'Chloé Nguyen',
			'Gaëlle Petit',
			'Hugo Marchand'
		]);
	});

	it('facility keeps only that facility', () => {
		expect(names({ facility: CENTRE_C.uid })).toEqual([
			'Damien Roux',
			'Farid Benali',
			'Élodie Barre'
		].sort(byName));
	});

	it('term matches on name, case-insensitively', () => {
		expect(names({ term: 'martin' })).toEqual(['Alice Martin']);
	});

	it('term ignores accents, so a plain keyboard finds everyone', () => {
		expect(names({ term: 'elodie' })).toEqual(['Élodie Barre']);
		expect(names({ term: 'gaelle' })).toEqual(['Gaëlle Petit']);
	});

	it('term matches anywhere in the name, not just the start', () => {
		expect(names({ term: 'benali' })).toEqual(['Farid Benali']);
	});

	it('tags require every selected tag, not merely one', () => {
		// Bruno alone carries both; Alice has onco, Damien and Hugo geria.
		expect(names({ tags: [TAG_ONCO, TAG_GERIA] })).toEqual(['Bruno Lopez']);
	});

	it('a single tag keeps everyone carrying it', () => {
		expect(names({ tags: [TAG_ONCO] })).toEqual([
			'Alice Martin',
			'Bruno Lopez',
			'Gaëlle Petit'
		]);
	});

	it('situation keeps only the entries it lists', () => {
		expect(names({ situation: { label: 'urgent', value: SITUATION_URGENT.uid } })).toEqual([
			'Alice Martin',
			'Damien Roux',
			'Farid Benali',
			'Hugo Marchand'
		]);
	});

	it('an empty situation yields nobody', () => {
		expect(names({ situation: { label: 'empty', value: SITUATION_EMPTY.uid } })).toEqual([]);
	});

	it('an unknown situation yields nobody rather than everybody', () => {
		// Failing open here would quietly show the whole directory.
		expect(names({ situation: { label: 'ghost', value: 'situation-does-not-exist' } })).toEqual([]);
	});

	it('currentOrg true keeps members of the organization', () => {
		expect(names({ currentOrg: true })).toEqual([
			'Alice Martin',
			'Bruno Lopez',
			'Chloé Nguyen',
			'Damien Roux',
			'Gaëlle Petit'
		]);
	});

	it('currentOrg false keeps non-members', () => {
		expect(names({ currentOrg: false })).toEqual([
			'Farid Benali',
			'Hugo Marchand',
			'Élodie Barre'
		].sort(byName));
	});

	it('limitCategories restricts by type slug, not uid', () => {
		expect(names({ limitCategories: [NURSE.slug] })).toEqual([
			'Alice Martin',
			'Bruno Lopez',
			'Farid Benali'
		]);
	});
});

describe('selectors combined', () => {
	it('reads as a conjunction: every selector must agree', () => {
		expect(names({ categories: [NURSE.uid], communes: [AVIGNON.uid] })).toEqual(['Farid Benali']);
	});

	it('narrows to nothing when the combination has no answer', () => {
		// Nurses exist and Nîmes exists, but no *active* nurse is in Nîmes.
		expect(names({ categories: [NURSE.uid], communes: [NIMES.uid] })).toEqual([]);
	});

	it('combines commune and facility, which are not one-to-one', () => {
		// Gadagne holds MSP_A and CABINET_B; only Bruno is at the latter.
		expect(names({ communes: [GADAGNE.uid], facility: CABINET_B.uid })).toEqual(['Bruno Lopez']);
	});

	it('combines department with commune, the coarser losing to the finer', () => {
		expect(
			names({ department: { label: 'Vaucluse', value: '84' }, communes: [AVIGNON.uid] })
		).toEqual(['Damien Roux', 'Farid Benali', 'Élodie Barre'].sort(byName));
	});

	it('yields nothing when department and commune contradict each other', () => {
		expect(
			names({ department: { label: 'Gard', value: '30' }, communes: [GADAGNE.uid] })
		).toEqual([]);
	});

	it('combines a tag with a category', () => {
		expect(names({ categories: [PHYSIO.uid], tags: [TAG_SPORT] })).toEqual([
			'Hugo Marchand',
			'Élodie Barre'
		].sort(byName));
	});

	it('combines a term with a category', () => {
		expect(names({ categories: [NURSE.uid], term: 'a' }).length).toBeGreaterThan(0);
		expect(names({ categories: [DOCTOR.uid], term: 'martin' })).toEqual([]);
	});

	it('applies the situation before the selectors, not instead of them', () => {
		expect(
			names({
				situation: { label: 'urgent', value: SITUATION_URGENT.uid },
				categories: [NURSE.uid]
			})
		).toEqual(['Alice Martin', 'Farid Benali']);
	});

	it('combines currentOrg with a selector', () => {
		expect(names({ currentOrg: false, communes: [AVIGNON.uid] })).toEqual([
			'Farid Benali',
			'Élodie Barre'
		].sort(byName));
	});

	it('lets active reach entries the other selectors still filter', () => {
		expect(names({ active: false, communes: [NIMES.uid] })).toEqual(['Inès Fabre']);
	});

	it('survives every selector being set at once', () => {
		expect(
			names({
				situation: { label: 'urgent', value: SITUATION_URGENT.uid },
				currentOrg: true,
				limitCategories: [NURSE.slug],
				categories: [NURSE.uid],
				department: { label: 'Vaucluse', value: '84' },
				communes: [GADAGNE.uid],
				facility: MSP_A.uid,
				term: 'alice',
				tags: [TAG_ONCO],
				active: true
			})
		).toEqual(['Alice Martin']);
	});
});

describe('grouping and order', () => {
	it('groups by effector type, alphabetically by default', () => {
		expect(groupNames(view())).toEqual(['infirmier', 'kinesitherapeute', 'medecin']);
	});

	it('puts each entry under its own type', () => {
		const groups = view().groups;
		expect(sorted(groups.get('infirmier')?.map((e) => e.name) ?? [])).toEqual([
			'Alice Martin',
			'Bruno Lopez',
			'Farid Benali'
		]);
	});

	it('orders groups by size, smallest first, when a situation is selected', () => {
		// A situation means "who can help with this", so the rarest capability
		// leads rather than the alphabet.
		const v = view({ situation: { label: 'urgent', value: SITUATION_URGENT.uid } });
		const sizes = groupNames(v).map((k) => v.groups.get(k)!.length);
		expect(sizes).toEqual([...sizes].sort((a, b) => a - b));
	});

	it('drops groups that no longer have anyone in them', () => {
		expect(groupNames(view({ categories: [NURSE.uid] }))).toEqual(['infirmier']);
	});

	it('yields no groups at all when nothing matches', () => {
		expect(groupNames(view({ term: 'nobody-by-this-name' }))).toEqual([]);
	});

	// KNOWN DEFECT, left failing on purpose: compareEffectorDistance guards
	// with `!dist_a`, and `!0` is true. An entry at exactly the searched
	// address — the closest possible match — is taken for one with no
	// coordinates and sorted last. Damien is 0 m away, Chloé 11 km, Gaëlle
	// 38 km; the code yields Chloé, Damien, Gaëlle.
	//
	// The assertion states the behaviour that is wanted, so it turns green
	// when the guard becomes an explicit undefined check.
	it.fails('orders within a group by distance when an address is given', () => {
		// Damien is at the searched address (0 m), Chloé 11 km off, Gaëlle 38 km.
		const avignon = {
			geometry: { coordinates: [4.805528, 43.949317] }
		} as never;
		const v = directoryView(
			{ ...directory, addressFeature: avignon },
			{ categories: [DOCTOR.uid] }
		);
		expect(v.groups.get('medecin')?.map((e) => e.name)).toEqual([
			'Damien Roux',
			'Chloé Nguyen',
			'Gaëlle Petit'
		]);
	});
});

describe('what the selectors may still offer', () => {
	it('offers every type, commune, department, facility and tag when nothing is chosen', () => {
		const o = view().options;
		expect(o.categories.map((t) => t.name).sort(byName)).toEqual([
			'infirmier',
			'kinesitherapeute',
			'medecin'
		]);
		expect(o.communes.map((c) => c.name).sort(byName)).toEqual(['Avignon', 'Châteauneuf-de-Gadagne', 'Nîmes']);
		expect(o.departments.sort()).toEqual(['30', '84']);
		expect(o.facilities.map((f) => f.name).sort(byName)).toEqual([
			'Cabinet B',
			'Centre C',
			'Maison de santé A',
			'Pôle D'
		].sort(byName));
		expect(o.tags.map((t) => t.uid).sort()).toEqual(['tag-geria', 'tag-onco', 'tag-sport']);
	});

	it('narrows the categories on offer to the chosen commune', () => {
		// Choosing Gadagne must not leave "kinésithérapeute" selectable: the
		// only physio there is inactive, so picking it would empty the list.
		expect(view({ communes: [GADAGNE.uid] }).options.categories.map((t) => t.name).sort(byName)).toEqual(
			['infirmier', 'medecin']
		);
	});

	it('narrows the communes on offer to the chosen category', () => {
		expect(view({ categories: [PHYSIO.uid] }).options.communes.map((c) => c.name).sort(byName)).toEqual([
			'Avignon',
			'Nîmes'
		]);
	});

	it('narrows the departments on offer to the chosen category', () => {
		expect(view({ categories: [DOCTOR.uid] }).options.departments.sort()).toEqual(['30', '84']);
		expect(view({ categories: [PHYSIO.uid] }).options.departments.sort()).toEqual(['30', '84']);
	});

	it('narrows the facilities on offer to the chosen commune', () => {
		expect(view({ communes: [GADAGNE.uid] }).options.facilities.map((f) => f.name).sort(byName)).toEqual([
			'Cabinet B',
			'Maison de santé A'
		]);
	});

	it('narrows the tags on offer to the chosen category', () => {
		expect(view({ categories: [PHYSIO.uid] }).options.tags.map((t) => t.uid).sort()).toEqual([
			'tag-geria',
			'tag-sport'
		]);
	});

	it('does not let a selector narrow its own option list', () => {
		// The category dropdown still offers every type after one is picked,
		// or the user could never widen or change their mind.
		expect(view({ categories: [NURSE.uid] }).options.categories.map((t) => t.name).sort(byName)).toEqual([
			'infirmier',
			'kinesitherapeute',
			'medecin'
		]);
		expect(view({ communes: [GADAGNE.uid] }).options.communes.map((c) => c.name).sort(byName)).toEqual([
			'Avignon',
			'Châteauneuf-de-Gadagne',
			'Nîmes'
		]);
	});

	it('offers no duplicates when many entries share a commune or facility', () => {
		const o = view().options;
		expect(o.communes.map((c) => c.uid)).toEqual([...new Set(o.communes.map((c) => c.uid))]);
		expect(o.facilities.map((f) => f.uid)).toEqual([...new Set(o.facilities.map((f) => f.uid))]);
		expect(o.tags.map((t) => t.uid)).toEqual([...new Set(o.tags.map((t) => t.uid))]);
	});

	it('offers options from the context-narrowed set, not the whole directory', () => {
		// A situation limits who is in play, so it must limit what is offered.
		const o = view({ situation: { label: 'urgent', value: SITUATION_URGENT.uid } }).options;
		expect(o.communes.map((c) => c.name).sort(byName)).toEqual(['Avignon', 'Châteauneuf-de-Gadagne', 'Nîmes']);
		expect(o.categories.map((t) => t.name).sort(byName)).toEqual([
			'infirmier',
			'kinesitherapeute',
			'medecin'
		]);
	});
});

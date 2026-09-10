/**
 * Entry fixtures for the directory filter tests.
 *
 * Shaped after a real /api/v2/entries payload rather than invented, so a test
 * cannot pass against a structure the API never sends. Only the fields the
 * filters actually read are filled in; `makeEntry` supplies the rest so each
 * test states just the part it is about.
 */
import type { Entry, Situation, Tag, Type } from './directoryStoreInterface.ts';
import type { Organization } from '$lib/interfaces/organization.ts';

export const ORG_UID = '94d1371aff1f47208e79ce6f89c4a006';

export const organization = { uid: ORG_UID } as Organization;

/** Effector types, reused so tests can assert on identity as well as count. */
export const NURSE: Type = {
	uid: 'type-nurse',
	name: 'infirmier',
	label: 'infirmier',
	raw_label: 'IDE',
	slug: 'infirmier',
	definition: null,
	synonyms: []
} as unknown as Type;

export const DOCTOR: Type = {
	uid: 'type-doctor',
	name: 'medecin',
	label: 'médecin',
	raw_label: 'MG',
	slug: 'medecin',
	definition: null,
	synonyms: []
} as unknown as Type;

export const TAG_ONCO: Tag = {
	uid: 'tag-onco',
	name: 'ooh',
	label: 'oncologie',
	labelShort: 'OOH',
	category: { label: 'mention', labelShort: 'mention', name: 'mention' },
	effector_types: [NURSE.uid]
} as unknown as Tag;

export const TAG_GERIA: Tag = {
	uid: 'tag-geria',
	name: 'geria',
	label: 'gériatrie',
	labelShort: 'GER',
	category: { label: 'mention', labelShort: 'mention', name: 'mention' },
	effector_types: [NURSE.uid]
} as unknown as Tag;

type EntryOverrides = {
	uid?: string;
	name?: string;
	active?: boolean;
	type?: Type;
	communeUid?: string;
	communeName?: string;
	departmentCode?: string;
	facilityUid?: string;
	facilityName?: string;
	memberships?: string[];
	tags?: Tag[] | null;
	longitude?: string | null;
	latitude?: string | null;
};

/** Builds an Entry with sane defaults; override only what the test is about. */
export function makeEntry(overrides: EntryOverrides = {}): Entry {
	const {
		uid = 'entry-1',
		name = 'Alice Martin',
		active = true,
		type = NURSE,
		communeUid = 'commune-gadagne',
		communeName = 'Châteauneuf-de-Gadagne',
		departmentCode = '84',
		facilityUid = 'facility-a',
		facilityName = 'Maison de santé',
		memberships = [ORG_UID],
		tags = null,
		longitude = '4.939488',
		latitude = '43.927596'
	} = overrides;

	return {
		uid,
		name,
		label: name,
		slug: name.toLowerCase().replace(/\s+/g, '-'),
		entrySlug: `${name.toLowerCase().replace(/\s+/g, '-')}-84`,
		active,
		effector_type: type,
		effector_uid: `effector-${uid}`,
		commune: { uid: communeUid, name: communeName, slug: 'chateauneuf', wikidata: '' },
		department: { code: departmentCode },
		facility: { uid: facilityUid, name: facilityName, label: 'MSP', slug: 'msp' },
		address: {
			facility_uid: facilityUid,
			city: communeName,
			country: 'France',
			zip: '84470',
			street: 'Route d’Avignon',
			building: '',
			geographical_complement: '',
			longitude,
			latitude,
			zoom: 18,
			tooltip_direction: null,
			tooltip_text: null,
			tooltip_permanent: null
		},
		memberships,
		tags,
		avatar: null,
		gender: null,
		phones: null,
		directories: ['gadagne'],
		owner: [],
		creator: [],
		access: 'anonymous',
		createdAt: 0,
		updatedAt: 0
	} as unknown as Entry;
}

/** A situation listing the entries that belong to it, as the API returns it. */
export function makeSituation(uid: string, entryUids: string[]): Situation {
	return { uid, name: uid, label: uid, entries: entryUids } as unknown as Situation;
}

/* ------------------------------------------------------------------------ *
 * A directory built for discrimination.
 *
 * The fixtures above let a test state one entry; this is a whole address book
 * shaped so that a *combination* of selectors has a single right answer. Each
 * entry differs from its neighbours on as few axes as possible, so a filter
 * that reads the wrong field, or ands where it should or, drops a namable
 * person rather than merely changing a count.
 *
 * Every name is unique and every axis is crossed by at least two entries, so
 * `expect(names).toEqual([...])` pins identity and order, never magnitude.
 * ------------------------------------------------------------------------ */

export const PHYSIO: Type = {
	uid: 'type-physio',
	name: 'kinesitherapeute',
	label: 'kinésithérapeute',
	raw_label: 'MK',
	slug: 'kinesitherapeute',
	definition: null,
	synonyms: []
} as unknown as Type;

export const TAG_SPORT: Tag = {
	uid: 'tag-sport',
	name: 'sport',
	label: 'sport',
	labelShort: 'SPT',
	category: { label: 'mention', labelShort: 'mention', name: 'mention' },
	effector_types: [PHYSIO.uid]
} as unknown as Tag;

/** Communes: two in department 84, one in 30, so department and commune can disagree. */
export const GADAGNE = { uid: 'commune-gadagne', name: 'Châteauneuf-de-Gadagne', dept: '84' };
export const AVIGNON = { uid: 'commune-avignon', name: 'Avignon', dept: '84' };
export const NIMES = { uid: 'commune-nimes', name: 'Nîmes', dept: '30' };

/** Facilities, deliberately not 1:1 with communes: MSP_A and CABINET_B share Gadagne. */
export const MSP_A = { uid: 'facility-a', name: 'Maison de santé A' };
export const CABINET_B = { uid: 'facility-b', name: 'Cabinet B' };
export const CENTRE_C = { uid: 'facility-c', name: 'Centre C' };
/** Nîmes has its own facility: coordinates are keyed by facility, so a facility
 * in two communes would give every entry there the last commune's distance. */
export const POLE_D = { uid: 'facility-d', name: 'Pôle D' };

/**
 * Ten entries. The grid, so a reader can predict any combination by eye:
 *
 *   name      type    commune  dept  facility    member  tags          active
 *   Alice     nurse   gadagne  84    MSP_A       yes     onco          yes
 *   Bruno     nurse   gadagne  84    CABINET_B   yes     onco, geria   yes
 *   Chloé     doctor  gadagne  84    MSP_A       yes     —             yes
 *   Damien    doctor  avignon  84    CENTRE_C    yes     geria         yes
 *   Élodie    physio  avignon  84    CENTRE_C    no      sport         yes
 *   Farid     nurse   avignon  84    CENTRE_C    no      —             yes
 *   Gaëlle    doctor  nimes    30    POLE_D      yes     onco          yes
 *   Hugo      physio  nimes    30    POLE_D      no      sport, geria  yes
 *   Inès      nurse   nimes    30    POLE_D      yes     —             no
 *   Jean      physio  gadagne  84    MSP_A       yes     —             no
 *
 * An untagged entry carries `tags: []`, which is what /api/v2/entries sends —
 * see allentries.py, where the serializer yields [] and `None` is only the
 * fallback for a serialization error. `tags: null` reaches the filters from
 * other endpoints (fullentry.py uses `serializer.data or None`), and tagOfF
 * throws on it once any other selector is set; that is a real difference
 * between the two payloads, not something this directory should paper over.
 *
 * Note the two inactive entries (Inès, Jean): `active` defaults to true in the
 * filter chain, so they are absent unless a test asks for them. They exist so
 * that "the default hides them" is a statement a test can make.
 */
export const directoryEntries: Entry[] = [
	makeEntry({ uid: 'e-alice', name: 'Alice Martin', type: NURSE, communeUid: GADAGNE.uid, communeName: GADAGNE.name, departmentCode: GADAGNE.dept, facilityUid: MSP_A.uid, facilityName: MSP_A.name, memberships: [ORG_UID], tags: [TAG_ONCO], longitude: '4.939488', latitude: '43.927596' }),
	makeEntry({ uid: 'e-bruno', name: 'Bruno Lopez', type: NURSE, communeUid: GADAGNE.uid, communeName: GADAGNE.name, departmentCode: GADAGNE.dept, facilityUid: CABINET_B.uid, facilityName: CABINET_B.name, memberships: [ORG_UID], tags: [TAG_ONCO, TAG_GERIA], longitude: '4.941000', latitude: '43.928000' }),
	makeEntry({ uid: 'e-chloe', name: 'Chloé Nguyen', type: DOCTOR, communeUid: GADAGNE.uid, communeName: GADAGNE.name, departmentCode: GADAGNE.dept, facilityUid: MSP_A.uid, facilityName: MSP_A.name, memberships: [ORG_UID], tags: [], longitude: '4.939488', latitude: '43.927596' }),
	makeEntry({ uid: 'e-damien', name: 'Damien Roux', type: DOCTOR, communeUid: AVIGNON.uid, communeName: AVIGNON.name, departmentCode: AVIGNON.dept, facilityUid: CENTRE_C.uid, facilityName: CENTRE_C.name, memberships: [ORG_UID], tags: [TAG_GERIA], longitude: '4.805528', latitude: '43.949317' }),
	makeEntry({ uid: 'e-elodie', name: 'Élodie Barre', type: PHYSIO, communeUid: AVIGNON.uid, communeName: AVIGNON.name, departmentCode: AVIGNON.dept, facilityUid: CENTRE_C.uid, facilityName: CENTRE_C.name, memberships: [], tags: [TAG_SPORT], longitude: '4.805528', latitude: '43.949317' }),
	makeEntry({ uid: 'e-farid', name: 'Farid Benali', type: NURSE, communeUid: AVIGNON.uid, communeName: AVIGNON.name, departmentCode: AVIGNON.dept, facilityUid: CENTRE_C.uid, facilityName: CENTRE_C.name, memberships: [], tags: [], longitude: '4.805528', latitude: '43.949317' }),
	makeEntry({ uid: 'e-gaelle', name: 'Gaëlle Petit', type: DOCTOR, communeUid: NIMES.uid, communeName: NIMES.name, departmentCode: NIMES.dept, facilityUid: POLE_D.uid, facilityName: POLE_D.name, memberships: [ORG_UID], tags: [TAG_ONCO], longitude: '4.360054', latitude: '43.836699' }),
	makeEntry({ uid: 'e-hugo', name: 'Hugo Marchand', type: PHYSIO, communeUid: NIMES.uid, communeName: NIMES.name, departmentCode: NIMES.dept, facilityUid: POLE_D.uid, facilityName: POLE_D.name, memberships: [], tags: [TAG_SPORT, TAG_GERIA], longitude: '4.360054', latitude: '43.836699' }),
	makeEntry({ uid: 'e-ines', name: 'Inès Fabre', type: NURSE, communeUid: NIMES.uid, communeName: NIMES.name, departmentCode: NIMES.dept, facilityUid: POLE_D.uid, facilityName: POLE_D.name, memberships: [ORG_UID], tags: [], active: false, longitude: '4.360054', latitude: '43.836699' }),
	makeEntry({ uid: 'e-jean', name: 'Jean Ferrand', type: PHYSIO, communeUid: GADAGNE.uid, communeName: GADAGNE.name, departmentCode: GADAGNE.dept, facilityUid: MSP_A.uid, facilityName: MSP_A.name, memberships: [ORG_UID], tags: [], active: false, longitude: '4.939488', latitude: '43.927596' })
];

/** Situations, as the API returns them: a uid and the entry uids it holds. */
export const SITUATION_URGENT = makeSituation('situation-urgent', ['e-alice', 'e-damien', 'e-farid', 'e-hugo']);
export const SITUATION_EMPTY = makeSituation('situation-empty', []);
export const directorySituations: Situation[] = [SITUATION_URGENT, SITUATION_EMPTY];

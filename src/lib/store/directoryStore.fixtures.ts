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
	departmentCode?: string;
	facilityUid?: string;
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
		departmentCode = '84',
		facilityUid = 'facility-a',
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
		commune: { uid: communeUid, name: 'Châteauneuf-de-Gadagne', slug: 'chateauneuf', wikidata: '' },
		department: { code: departmentCode },
		facility: { uid: facilityUid, name: 'Maison de santé', label: 'MSP', slug: 'msp' },
		address: {
			facility_uid: facilityUid,
			city: 'Châteauneuf-de-Gadagne',
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

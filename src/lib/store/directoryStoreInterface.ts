import type { Phone } from '$lib/interfaces/phone.interface.ts';
import type { Writable } from 'svelte/store';
import type { Facility } from '$lib/interfaces/facility.interface.ts';
import type { Appointment } from '$lib/interfaces/appointment.interface.ts';
import type { CarteVitale, Convention, PaymentMethod, ThirdPartyPayer, SpokenLanguage } from '$lib/interfaces/fullEffector.interface.ts';
import type { Email } from '$lib/interfaces/email.interface.ts';
import type { SocialNetwork } from '$lib/interfaces/socialnetwork.interface.ts';
import type { Website } from '$lib/interfaces/website.interface.ts';
import type { Address } from '$lib/interfaces/facility.interface.ts';
import type { Commune } from '$lib/interfaces/geography.interface.ts';
import type { Avatar } from '$lib/interfaces/facility.interface.ts';

export interface Department {
    code: string
}

export interface Type {
    definition: string | null,
    label: string | null,
    raw_label: string | null,
    name: string,
    slug: string,
    synonyms: string[] | null,
    uid: string,
    labels: string[],
    nature?: Nature | null,
    /** Its entries have no premises of their own (a help line): no address, map or facility link. */
    immaterial?: boolean
}

export type Nature = 'profession' | 'service' | 'activity';

export interface TagCategory {
        uid: string;
        name: string;
        label: string;
        labelShort: string;
}

export interface Tag {
    uid: string;
    name: string;
    label: string;
    labelShort: string;
    category: TagCategory;
    effector_types: string[];
}

export const CARE_LEVELS = ['emergency', 'primary', 'secondary', 'tertiary', 'prevention'] as const;
export const WHO_CAN_CONTACT = ['anyone', 'referral', 'professionals'] as const;
export const ACCESS_MODES = ['phone', 'walk_in', 'appointment', 'admission', 'online', 'teleexpertise', 'home_visit'] as const;
export const AUDIENCES = ['students', 'caregivers', 'parents', 'women', 'men', 'lgbtqia', 'older_adults'] as const;

/** Who an entry is for and how to reach it, as the backend stores it (backend/src/directory/facets.py). Null is unknown, never "no". */
export interface EntryFacets {
    age_min: number|null;
    age_max: number|null;
    care_levels: (typeof CARE_LEVELS)[number][]|null;
    who_can_contact: (typeof WHO_CAN_CONTACT)[number]|null;
    access_modes: (typeof ACCESS_MODES)[number][]|null;
    audiences: (typeof AUDIENCES)[number][]|null;
    free: boolean|null;
    anonymous_care: boolean|null;
}

export interface Entry extends Partial<EntryFacets> {
    active: boolean|null;
    address: Address;
    avatar: Avatar;
    commune: Commune;
    department: Department;
    effector_uid: string;
    effector_type: Type;
    facility: Facility;
    gender: string | null;
    label: string;
    memberships: string[];
    name: string;
    phones: Phone[];
    resource_uri: string;
    slug: string;
    entrySlug: string;
    tags: Tag[]|null;
    uid: string;
    updatedAt: number;
    owner: string[]|null;
    creator: string[]|null;
}

/** A place an entry answers for (COVERS), widest first. */
export interface Coverage {
    uid: string;
    name: string | null;
    kind: 'country' | 'region' | 'department' | 'commune';
}

/** An entry linked to another: its porteur, or a service it runs (GET /api/v2/fullentries). */
export interface RelatedEntry {
    uid: string;
    slug: string;
    name: string;
    label: string | null;
    effector_type: string;
    siren?: string | null;
}

export interface EntryFull extends Partial<EntryFacets> {
    /** What the service offers, for whom and on what terms, in the site's language. */
    description?: string | null;
    /** The entry that runs this one, if any. */
    run_by?: RelatedEntry | null;
    /** The entries this one runs. */
    services?: RelatedEntry[] | null;
    /** The slugs of what this entry handles (MANAGES). */
    manages?: string[];
    /** Where the entry answers (COVERS). */
    coverage?: Coverage[];
    active: boolean;
    address: Address;
    appointments: Appointment[] | null;
    avatar: Avatar;
    carte_vitale: CarteVitale;
    convention: Convention | null;
    directories: string[];
    effector_uid: string;
    emails: Email[];
    facility: Facility;
    gender: string | null;
    label: string;
    name: string;
    payment_methods: PaymentMethod[] | null;
    organizations: string[];
    phones: Phone[] | null;
    profile: any | null;
    resource_uri: string;
    rpps: number | null;
    slug: string;
    entrySlug: string;
    socialnetworks: SocialNetwork[] | null;
    spoken_languages: SpokenLanguage[] | null;
    third_party_payers: ThirdPartyPayer[] | null;
    effector_type: Type;
    uid: string;
    updatedAt: number;
    websites: Website[] | null;
    memberships: string[]|null;
    tags: Tag[]|null;
    owner: string[]|null;
    creator: string[]|null;
    redeemEmail: string|null;
    access: string;
}

/** How a page credits a team member (GET /api/v2/entry-credits). An EntryFull fits it too. */
export interface EntryCredit {
    entrySlug: string;
    name: string;
    effector_type: Pick<Type, 'name' | 'label'>;
    active: boolean | null;
    avatar: Pick<Avatar, 'sm' | 'lg' | 'raw'> | null;
}

export interface AvailableDirectory {
    name: string;
    display_name: string;
}

export interface FeatureCollection {
    type: "FeatureCollection",
    features: AddressFeature[],
    query: string
}

export interface AddressFeature {
    type: "Feature",
    geometry: {
        type: string,
        coordinates: [number, number]
    },
    properties: {
        label: string,
        score: number,
        housenumber: string,
        id: string,
        banId: string,
        name: string,
        postcode: string,
        citycode: string,
        x: number,
        y: number,
        city: string,
        context: string,
        type: string,
        importance: number,
        street: string
        _type: string
    }
}

export interface Contact {
    resource_uri: string,
    timestamp: number,
    uid: string
}

export interface Situation {
    entries: string[],
    name: string,
    uid: string
}

export type CurrentOrg = boolean | null

export type CurrentOrgStore = Writable<boolean | null>

export type LimitCategoriesStore = Writable<string[]>

export interface DistanceEffectors {
    [index: string]: number;
}

export type CategorizedEntries = Map<string, Entry[]>;

interface CommuneValue {
    label: string,
    value: string,

}

export type CommunesValue = CommuneValue[];

export type CommunesValueStore = Writable<CommunesValue|null>;

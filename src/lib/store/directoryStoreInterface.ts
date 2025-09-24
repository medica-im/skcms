import type { Phone } from '$lib/interfaces/phone.interface.js';
import type { Writable } from '@square/svelte-store';
import type { Facility } from '$lib/interfaces/facility.interface.ts';
import type { Appointment } from '$lib/interfaces/appointment.interface.ts';
import type { CarteVitale, Convention, PaymentMethod, ThirdPartyPayer, SpokenLanguage } from '$lib/interfaces/fullEffector.interface.ts';
import type { Email } from '$lib/interfaces/email.interface.ts';
import type { SocialNetwork } from '$lib/interfaces/socialnetwork.interface.js';
import type { Website } from '$lib/interfaces/website.interface';

export interface Situation {
    value: string;
    label: string;
}

export interface Address {
    building: string | null;
    city: string;
    country: string;
    facility_uid: string;
    geographical_complement: string | null;
    latitude: string | null;
    longitude: string | null;
    street: string | null;
    zip: string | null;
    zoom: number | null;
    tooltip_direction: string | null;
    tooltip_permanent?: boolean | null;
    tooltip_text?: string | null;
}

export interface Avatar {
    fb: string,
    lt: string,
    raw: string
}

export interface Commune {
    name: string,
    slug: string,
    uid: string,
    wikidata: string
}

export interface Type {
    definition: string | null,
    label: string | null,
    name: string,
    slug: string,
    synonyms: string[] | null,
    uid: string,
    labels: string[]
}

export interface Entry {
    address: Address,
    appointments: Appointment[],
    avatar: Avatar,
    carte_vitale: CarteVitale | null,
    commune: Commune,
    effector_uid: string,
    emails: Email[],
    facility: Facility,
    gender: string | null,
    label: string,
    name: string,
    organizations: string[],
    employers: string[],
    phones: Phone[],
    resource_uri: string,
    slug: string,
    effector_type: Type,
    uid: string,
    updatedAt: number
}

export interface EntryFull {
    address: Address,
    appointments: Appointment[] | null,
    avatar: Avatar,
    carte_vitale: CarteVitale,
    convention: Convention | null,
    effector_uid: string,
    emails: Email[],
    facility: Facility,
    gender: string | null,
    label: string,
    name: string,
    payment_methods: PaymentMethod[] | null,
    organizations: string[],
    phones: Phone[] | null,
    profile: any | null,
    resource_uri: string,
    rpps: number | null,
    slug: string,
    socialnetworks: SocialNetwork[] | null,
    spoken_languages: SpokenLanguage[] | null,
    third_party_payers: ThirdPartyPayer[] | null,
    effector_type: Type,
    uid: string,
    updatedAt: number,
    websites: Website[] | null
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

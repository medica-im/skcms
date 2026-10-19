import type { Nature } from '$lib/store/directoryStoreInterface';

export interface EffectorType {
    uid: string,
    name_fr: string,
    name_en: string|null,
    label_fr: string,
    label_en: string|null,
    synonyms_fr: string[]|null,
    synonyms_en: string[]|null,
    definition_fr: string|null,
    definition_en: string|null,
    slug_fr: string|null,
    slug_en: string|null,
    effector_type_uid: string|null,
    effector_type_label_fr: string|null,
    isHCW: boolean,
    isRPPS: boolean,
    /** False for a category that only groups others ("médecin"): no entry can have it. */
    assignable: boolean,
    /** What its entries do; null for a category, or a type not classified yet. */
    nature: Nature | null,
    unique_ID: string|null,
    concept_en: string|null,
    concept_fr: string|null,
}

export interface Effector {
    uid: string,
    name_fr: string,
    label_fr: string,
    slug_fr: string,
    updatedAt: number,
    createdAt: number,
    gender: string,
    rpps: string|null,
    creator_directory: string|null,
}
export interface EffectorType {
    uid: string,
    name_fr: string,
    label_fr: string,
    synonyms_fr: string[]|null,
    definition_fr: string|null,
    slug_fr: string|null,
    effector_type_uid: string|null,
    effector_type_label_fr: string|null,
    isHCW: boolean,
    isRPPS: boolean,
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
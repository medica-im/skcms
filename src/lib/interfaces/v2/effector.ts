export interface EffectorType {
    uid: string,
    name: string,
    label: string,
    synonyms: string[]|null,
    definition: string|null,
    slug: string
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
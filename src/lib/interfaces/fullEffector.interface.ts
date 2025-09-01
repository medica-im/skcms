export type CarteVitale = boolean

export interface Convention {
    definition: string | null,
    label: string,
    name: string,
    uid: string
}

export interface PaymentMethod {
    definition_en: string | null,
    definition_fr: string | null,
    label_en: string,
    label_fr: string,
    name: string,
    uid: string
    }

export interface ThirdPartyPayer {
    definition_en: string | null,
    definition_fr: string | null,
    label_en: string,
    label_fr: string,
    name: string,
    uid: string
}

export interface SpokenLanguage {
    language: string
}
interface Coordinate {
    latitude: number,
    longitude: number
}

export interface DepartmentOfFrance {
    uid: string
    name: string
    code: string
    slug: string
    wikidata: string
}

export interface Commune {
    uid: string
    name_fr: string
    slug_fr: string
    wikidata: string|null
    department: DepartmentOfFrance
}

export interface Facility {
    uid: string
    commune: Commune
    updated: number
    name: string|null
    label: string|null
    slug: string|null
    location: Coordinate|null
    zoom: number|null
    building: string|null
    street: string|null
    geographical_complement: string|number
    zip: string|null
    effectors: string[]|null
}

export interface FacilityV2 {
    uid: string
    commune: Commune
    updated: number
    name: string|null
    label: string|null
    slug: string|null
    location: Coordinate|null
    zoom: number|null
    building: string|null
    street: string
    geographical_complement: string|number
    zip: string|null
    effectors: string[]|null
    ban_id: string|null
    ban_banId: string|null
}

export interface Effector {
    name_fr: string,
    label_fr: string|null,
    slug_fr: string|null,
    gender: string,
    uid: string,
    name_en?: string|null,
    label_en?: string|null,
    slug_en?: string|null,
    updatedAt: number,
    createdAt: number
}
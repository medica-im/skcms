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

/**
 * A wide (16:9) photograph of the place, distinct from the square avatar.
 * Carries no access level: a picture of a building is public.
 */
export interface PlaceImage {
    sm: string|null
    lg: string|null
    raw: string|null
    alt: string
}

export interface Facility {
    uid: string
    commune: string
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
    geographical_complement: string|null
    zip: string|null
    effectors: string[]|null
    ban_id: string|null
    ban_banId: string|null
    image: PlaceImage|null
}
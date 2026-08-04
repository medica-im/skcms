import type { SocialNetwork } from '$lib/interfaces/socialnetwork.interface.js';
import type { Website } from '$lib/interfaces/website.interface.js';
import type { Email } from '$lib/interfaces/email.interface.js';
import type { Phone } from '$lib/interfaces/phone.interface.js';

export interface Address {
    building: string|null,
    city: string,
    country: string,
    facility_uid: string,
    geographical_complement: string|null
    latitude: string|null,
    longitude: string|null,
    street: string,
    zip: string|null,
    zoom: number|null,
    tooltip_direction: string|null;
    tooltip_permanent?: boolean|null;
    tooltip_text?: string|null;
}

export interface Avatar {
    sm: string,
    lg: string,
    raw: string,
    // Minimum role required to see the picture (anonymous | staff | administrator)
    access?: string
}

/**
 * A wide (16:9) photograph of the place, as opposed to the square avatar.
 * Carries no access level: a picture of a building is public.
 */
export interface PlaceImage {
    sm: string|null,
    lg: string|null,
    raw: string|null,
    alt: string
}

export interface Facility {
    uid: string;
    address: Address;
    ban_banId: string|null;
    ban_id: string|null;
    commune: string;
    name: string;
    label: string;
    organizations: any[];
    resource_uri: string;
    slug: string;
    socialnetworks: SocialNetwork[]|null;
    websites: Website[]|null;
    avatar: Avatar|null;
    image: PlaceImage|null;
    emails: Email[]|null;
    phones: Phone[]|null;
    entries: string[];
}


export interface FacilityIntersect extends Facility {
    htmlElement: HTMLElement|null;
}


export interface FacilityOf extends Address {
    uid: string,
    name: string,
    label: string,
    slug: string,
}


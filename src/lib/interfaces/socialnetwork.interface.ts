import type { Role } from '$lib/interfaces/access.interface';

export interface SocialNetwork {
    id: number;
    handle: string;
    url: string;
    type: string;
    type_display: string;
    roles: Role[];
}
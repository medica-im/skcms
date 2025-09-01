import type { Role } from '$lib/interfaces/access.interface';

export interface Website {
    id: number,
    url: string,
    roles: Role[]
}
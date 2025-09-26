import type { Role } from '$lib/interfaces/access.interface';

export interface Phone {
    id: number,
    phone: string,
    type: "M"|"MW"|"W"|"F"|"AS",
    type_display?: string,
    roles?: Role[],
}
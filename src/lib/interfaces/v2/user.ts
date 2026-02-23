import type { Role } from './invitee';

export interface AccountOut {
    uid: string;
    iss: string | null;
    sub: string;
    createdAt: number | null;
}

export interface AccessOut {
    uid: string;
    role: Role;
    createdAt: number | null;
    active: boolean | null;
}

export interface User {
    uid: string;
    email: string | null;
    name: string | null;
    createdAt: number | null;
    accounts: AccountOut[];
    access: AccessOut[];
}

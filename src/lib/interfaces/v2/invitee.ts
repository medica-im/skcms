export type Role = 'superuser' | 'administrator' | 'staff' | 'registered' | 'anonymous';

export interface Invitee {
    uid: string;
    email: string;
    name: string | null;
    createdAt: string;
    createdBy: string;
    role: Role;
    active: boolean;
}

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
    // A suspended access stays active and keeps its role, so this is a separate
    // question from `active`: the identity survives, the privileges do not.
    suspendedAt?: number | null;
    suspensionReason?: string | null;
}

/**
 * One role a user has held, current or superseded.
 *
 * A role is never edited in place — changing one deactivates the old access and
 * creates another — so the past ones are still here with the time they ended
 * and who ended them. `createdByRole` is what the actor held at the time,
 * recorded rather than resolved on read: an actor demoted next month still
 * acted as an administrator today.
 */
export interface AccessHistory {
    uid: string;
    role: Role;
    active: boolean | null;
    createdAt: number | null;
    createdBy: string | null;
    createdByName: string | null;
    createdByRole: Role | null;
    supersededAt: number | null;
    supersededBy: string | null;
    suspendedAt: number | null;
    suspensionReason: string | null;
}

export interface User {
    uid: string;
    email: string | null;
    name: string | null;
    createdAt: number | null;
    accounts: AccountOut[];
    access: AccessOut[];
}

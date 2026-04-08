export interface BoardMember {
    uid: string;
    entry_uid: string;
    effector_uid: string;
    category_uid: string | null;
    start: string;
    stop: string | null;
}

export interface Officer {
    uid: string;
    entry_uid: string;
    effector_uid: string;
    role_uid: string;
    role_label: string | null;
    start: string;
    stop: string | null;
}

export interface OrganizationRole {
    uid: string;
    label: string;
}

export interface MembershipCategory {
    uid: string;
    entry_uid: string;
    label: string;
}

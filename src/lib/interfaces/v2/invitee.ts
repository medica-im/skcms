export type Role = 'superuser' | 'administrator' | 'staff' | 'registered' | 'anonymous';

/** The latest attempt at sending the invitation's email (backend mailer.delivery). */
export interface EmailDelivery {
    /** sent: accepted by Mailgun. unconfirmed: queued, and nothing settled it. */
    status: 'queued' | 'sent' | 'failed' | 'unconfirmed';
    at: string;
    error: string | null;
}

export interface Invitee {
    uid: string;
    email: string;
    name: string | null;
    createdAt: string;
    createdBy: string;
    role: Role;
    active: boolean;
    redeemedAt: number | null;
    /** null: no recorded attempt (created before tracking, or never emailed). */
    emailDelivery?: EmailDelivery | null;
}

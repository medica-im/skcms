export type Role = 'superuser' | 'administrator' | 'staff' | 'registered' | 'anonymous';

/** The latest attempt at sending the invitation's email (backend mailer.delivery). */
export interface EmailDelivery {
    /** sent: accepted by Mailgun. failed: refused, or queued and never settled. */
    status: 'queued' | 'sent' | 'failed';
    at: string;
    /** Mailgun's reason for a refusal. */
    error: string | null;
    /** Failed because nothing settled it in time: the worker died before it could say so. */
    timedOut?: boolean;
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

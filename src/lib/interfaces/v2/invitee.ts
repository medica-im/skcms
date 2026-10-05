export type Role = 'superuser' | 'administrator' | 'staff' | 'registered' | 'anonymous';

/** The latest attempt at sending the invitation's email (backend mailer.delivery). */
export type EmailDeliveryStatus =
    | 'queued'
    | 'sent'
    | 'delivered'
    | 'deferred'
    | 'bounced'
    | 'complained'
    | 'suppressed'
    | 'failed';

/** Why an email was not accepted, provider-neutral (backend mailer.providers.base.ErrorKind). */
export type EmailErrorKind =
    | 'invalid_request'
    | 'misconfigured'
    | 'rate_limited'
    | 'provider_unavailable'
    | 'unreachable'
    | 'outcome_unknown';

export interface EmailDelivery {
    /**
     * sent: accepted by the mail service. failed: refused, or queued and never
     * settled. delivered / deferred / bounced / complained: the service's
     * events. suppressed: not sent, the address is on the do-not-send list.
     */
    status: EmailDeliveryStatus;
    at: string;
    /** What kind of failure, in terms the page can explain. */
    errorKind?: EmailErrorKind | null;
    /** The mail service's own words for a refusal. */
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

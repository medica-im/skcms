/**
 * How an invitation email's status and failure reason read, wherever shown:
 * the invitation list and page (InviteeEmailDelivery) and the batch report.
 */
import {
	faPaperPlane,
	faCircleCheck,
	faHourglassHalf,
	faCircleQuestion,
	faCircleXmark,
	faClock,
	type IconDefinition
} from '@fortawesome/free-solid-svg-icons';
import * as m from '$msgs';
import type { EmailDeliveryStatus, EmailErrorKind } from '$lib/interfaces/v2/invitee';
import { needsCheck } from './inviteeFilter';

export type DeliveryState = EmailDeliveryStatus | 'unknown';

type Look = {
	icon: IconDefinition;
	words: () => string;
	short: () => string;
	tone: string;
	hint?: () => string;
};

const FAILURE_TONE = 'text-error-700-200-token font-bold';

export const deliveryLook: Record<DeliveryState, Look> = {
	sent: { icon: faPaperPlane, words: m.INVITEE_EMAIL_SENT, short: m.INVITEE_EMAIL_SENT_SHORT, tone: 'text-success-800-100-token', hint: m.INVITEE_EMAIL_SENT_HINT },
	delivered: { icon: faCircleCheck, words: m.INVITEE_EMAIL_DELIVERED, short: m.INVITEE_EMAIL_DELIVERED_SHORT, tone: 'text-success-800-100-token', hint: m.INVITEE_EMAIL_DELIVERED_HINT },
	queued: { icon: faHourglassHalf, words: m.INVITEE_EMAIL_QUEUED, short: m.INVITEE_EMAIL_QUEUED_SHORT, tone: 'text-surface-700-200-token' },
	deferred: { icon: faClock, words: m.INVITEE_EMAIL_DEFERRED, short: m.INVITEE_EMAIL_DEFERRED_SHORT, tone: 'text-warning-800-100-token', hint: m.INVITEE_EMAIL_DEFERRED_HINT },
	failed: { icon: faCircleXmark, words: m.INVITEE_EMAIL_FAILED, short: m.INVITEE_EMAIL_FAILED_SHORT, tone: FAILURE_TONE },
	bounced: { icon: faCircleXmark, words: m.INVITEE_EMAIL_BOUNCED, short: m.INVITEE_EMAIL_BOUNCED_SHORT, tone: FAILURE_TONE, hint: m.INVITEE_EMAIL_BOUNCED_HINT },
	complained: { icon: faCircleXmark, words: m.INVITEE_EMAIL_COMPLAINED, short: m.INVITEE_EMAIL_COMPLAINED_SHORT, tone: FAILURE_TONE, hint: m.INVITEE_EMAIL_COMPLAINED_HINT },
	suppressed: { icon: faCircleXmark, words: m.INVITEE_EMAIL_SUPPRESSED, short: m.INVITEE_EMAIL_SUPPRESSED_SHORT, tone: FAILURE_TONE, hint: m.INVITEE_EMAIL_SUPPRESSED_HINT },
	unknown: { icon: faCircleQuestion, words: m.INVITEE_EMAIL_UNKNOWN, short: () => '—', tone: 'text-surface-600-300-token', hint: m.INVITEE_EMAIL_UNKNOWN_HINT }
};

/** Did not reach the invitee and needs someone to act: the red cross, a link to the invitation. */
export const NEEDS_ACTION: ReadonlySet<DeliveryState> = new Set(['failed', 'bounced', 'complained', 'suppressed']);

/** Went as far as it should: nothing to flag on the compact card. */
export const SETTLED_OK: ReadonlySet<DeliveryState> = new Set(['sent', 'delivered', 'unknown']);

/** What a failure means and what to do, in a sentence. */
export const errorKindWords: Record<EmailErrorKind, () => string> = {
	invalid_request: m.EMAIL_ERROR_INVALID_REQUEST,
	misconfigured: m.EMAIL_ERROR_MISCONFIGURED,
	rate_limited: m.EMAIL_ERROR_RATE_LIMITED,
	provider_unavailable: m.EMAIL_ERROR_PROVIDER_UNAVAILABLE,
	unreachable: m.EMAIL_ERROR_UNREACHABLE,
	outcome_unknown: m.EMAIL_ERROR_OUTCOME_UNKNOWN
};

/** The same, in a few words, for counters. */
export const errorKindShort: Record<EmailErrorKind, () => string> = {
	invalid_request: m.EMAIL_ERROR_INVALID_REQUEST_SHORT,
	misconfigured: m.EMAIL_ERROR_MISCONFIGURED_SHORT,
	rate_limited: m.EMAIL_ERROR_RATE_LIMITED_SHORT,
	provider_unavailable: m.EMAIL_ERROR_PROVIDER_UNAVAILABLE_SHORT,
	unreachable: m.EMAIL_ERROR_UNREACHABLE_SHORT,
	outcome_unknown: m.EMAIL_ERROR_OUTCOME_UNKNOWN_SHORT
};

/**
 * Why an invitation's address needs checking, for the flag and the
 * invitation page: the backend's remembered reason (addressIssue) first,
 * else what its latest email says. null when the address is fine
 * (inviteeFilter.needsCheck decides).
 */
export type AddressProblem = 'bounced' | 'refused' | 'complained' | 'unsubscribed' | 'suppressed';

export function addressProblemOf(invitee: {
	redeemedAt?: number | null;
	emailDelivery?: { status: string; errorKind?: string | null } | null;
	addressIssue?: { reason: AddressProblem } | null;
}): AddressProblem | null {
	if (!needsCheck(invitee as never)) return null;
	if (invitee.addressIssue) return invitee.addressIssue.reason;
	const status = invitee.emailDelivery?.status;
	if (status === 'bounced' || status === 'complained' || status === 'suppressed') return status;
	return 'refused';
}

/** A refusal of the organization's mail: explained, never sent anyway. */
export const OPTED_OUT: ReadonlySet<AddressProblem> = new Set(['complained', 'unsubscribed']);

export const addressProblemShort: Record<AddressProblem, () => string> = {
	bounced: m.ADDRESS_PROBLEM_BOUNCED_SHORT,
	refused: m.ADDRESS_PROBLEM_REFUSED_SHORT,
	complained: m.ADDRESS_PROBLEM_COMPLAINED_SHORT,
	unsubscribed: m.ADDRESS_PROBLEM_UNSUBSCRIBED_SHORT,
	suppressed: m.ADDRESS_PROBLEM_SUPPRESSED_SHORT
};

/** What happened and what to do. */
export const addressProblemWords: Record<AddressProblem, () => string> = {
	bounced: m.ADDRESS_PROBLEM_BOUNCED,
	refused: m.ADDRESS_PROBLEM_REFUSED,
	complained: m.ADDRESS_PROBLEM_COMPLAINED,
	unsubscribed: m.ADDRESS_PROBLEM_UNSUBSCRIBED,
	suppressed: m.ADDRESS_PROBLEM_SUPPRESSED
};

/** A date as the invitation pages write it: "6 octobre 2026". */
export function dayOf(iso: string): string {
	return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** What a check before sending found (backend mailer.addresscheck), in words. */
export const addressCheckWords: Record<string, () => string> = {
	no_mail_domain: m.ADDRESS_CHECK_NO_MAIL_DOMAIN,
	bounced: m.ADDRESS_CHECK_KNOWN_BAD,
	refused: m.ADDRESS_CHECK_KNOWN_BAD,
	complained: m.ADDRESS_CHECK_OPTED_OUT,
	unsubscribed: m.ADDRESS_CHECK_OPTED_OUT
};

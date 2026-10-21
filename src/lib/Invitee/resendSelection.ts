/**
 * Which invitations a reminder may go to, and which start ticked.
 * The rules and why: see resendSelection.test.ts.
 */
import type { Invitee } from '$lib/interfaces/v2/invitee';
import { inviteeStatusOf, needsCheck } from './inviteeFilter';

const DAY = 86_400_000;

export type ResendRefusal = 'used' | 'disabled' | 'queued' | 'address';

export type ResendEligibility =
	| { sendable: false; reason: ResendRefusal }
	| { sendable: true; preselected: true }
	| { sendable: true; preselected: false; excludedBecause: 'recent' };

export function resendEligibility(invitee: Invitee, now: number, resendAfterDays: number): ResendEligibility {
	const status = inviteeStatusOf(invitee);
	if (status !== 'active') return { sendable: false, reason: status };
	const delivery = invitee.emailDelivery;
	if (delivery?.status === 'queued' && !delivery.timedOut) return { sendable: false, reason: 'queued' };
	if (needsCheck(invitee)) return { sendable: false, reason: 'address' };

	const arrived = delivery && delivery.status !== 'failed' && !delivery.timedOut;
	if (arrived && now - Date.parse(delivery.at) < resendAfterDays * DAY) {
		return { sendable: true, preselected: false, excludedBecause: 'recent' };
	}
	return { sendable: true, preselected: true };
}

export function initialResendSelection(invitees: Invitee[], now: number, resendAfterDays: number): Set<string> {
	return new Set(
		invitees
			.filter((invitee) => {
				const eligibility = resendEligibility(invitee, now, resendAfterDays);
				return eligibility.sendable && eligibility.preselected;
			})
			.map((invitee) => invitee.uid)
	);
}

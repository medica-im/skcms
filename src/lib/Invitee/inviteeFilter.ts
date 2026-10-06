/**
 * An invitation's status, and filtering the invitations list by it.
 * The rules and why: see inviteeFilter.test.ts.
 */
import type { AddressIssue, EmailDelivery } from '$lib/interfaces/v2/invitee';

export type InviteeStatusValue = 'active' | 'used' | 'disabled';
/** A status, everything, or "à vérifier": a cut across the statuses. */
export type InviteeFilter = 'all' | InviteeStatusValue | 'check';

type HasStatus = {
	active?: boolean | null;
	redeemedAt?: number | null;
	emailDelivery?: EmailDelivery | null;
	addressIssue?: AddressIssue | null;
};

/** Used once redeemed; otherwise active or deactivated by its "Actif" flag. */
export function inviteeStatusOf(invitee: HasStatus): InviteeStatusValue {
	if (invitee.redeemedAt != null) return 'used';
	return invitee.active ? 'active' : 'disabled';
}

/** The latest email went wrong because of the address itself. */
const ADDRESS_FAULT = new Set(['bounced', 'complained', 'suppressed']);

/** Its address needs checking with the member: see inviteeFilter.test.ts. */
export function needsCheck(invitee: HasStatus): boolean {
	if (invitee.redeemedAt != null) return false;
	if (invitee.addressIssue) return true;
	const delivery = invitee.emailDelivery;
	if (!delivery) return false;
	return (
		ADDRESS_FAULT.has(delivery.status) ||
		(delivery.status === 'failed' && delivery.errorKind === 'invalid_request')
	);
}

export function countByStatus(invitees: HasStatus[]): Record<InviteeFilter, number> {
	const counts = { all: invitees.length, active: 0, used: 0, disabled: 0, check: 0 };
	for (const invitee of invitees) {
		counts[inviteeStatusOf(invitee)]++;
		if (needsCheck(invitee)) counts.check++;
	}
	return counts;
}

export function filterInvitees<T extends HasStatus>(invitees: T[], filter: InviteeFilter): T[] {
	if (filter === 'all') return invitees;
	if (filter === 'check') return invitees.filter(needsCheck);
	return invitees.filter((i) => inviteeStatusOf(i) === filter);
}

/** The ?statut= values: French, since they show in the address bar. */
const PARAM: Record<Exclude<InviteeFilter, 'all'>, string> = {
	active: 'actives',
	used: 'utilisees',
	disabled: 'desactivees',
	check: 'a-verifier'
};

export function filterFromParam(value: string | null): InviteeFilter {
	const found = (Object.keys(PARAM) as Exclude<InviteeFilter, 'all'>[]).find((k) => PARAM[k] === value);
	return found ?? 'all';
}

/** null for "all": the parameter is simply left out. */
export function filterToParam(filter: InviteeFilter): string | null {
	return filter === 'all' ? null : PARAM[filter];
}

/**
 * An invitation's status, and filtering the invitations list by it.
 * The rules and why: see inviteeFilter.test.ts.
 */

export type InviteeStatusValue = 'active' | 'used' | 'disabled';
export type InviteeFilter = 'all' | InviteeStatusValue;

type HasStatus = { active?: boolean | null; redeemedAt?: number | null };

/** Used once redeemed; otherwise active or deactivated by its "Actif" flag. */
export function inviteeStatusOf(invitee: HasStatus): InviteeStatusValue {
	if (invitee.redeemedAt != null) return 'used';
	return invitee.active ? 'active' : 'disabled';
}

export function countByStatus(invitees: HasStatus[]): Record<InviteeFilter, number> {
	const counts = { all: invitees.length, active: 0, used: 0, disabled: 0 };
	for (const invitee of invitees) counts[inviteeStatusOf(invitee)]++;
	return counts;
}

export function filterInvitees<T extends HasStatus>(invitees: T[], filter: InviteeFilter): T[] {
	return filter === 'all' ? invitees : invitees.filter((i) => inviteeStatusOf(i) === filter);
}

/** The ?statut= values: French, since they show in the address bar. */
const PARAM: Record<InviteeStatusValue, string> = {
	active: 'actives',
	used: 'utilisees',
	disabled: 'desactivees'
};

export function filterFromParam(value: string | null): InviteeFilter {
	const found = (Object.keys(PARAM) as InviteeStatusValue[]).find((k) => PARAM[k] === value);
	return found ?? 'all';
}

/** null for "all": the parameter is simply left out. */
export function filterToParam(filter: InviteeFilter): string | null {
	return filter === 'all' ? null : PARAM[filter];
}

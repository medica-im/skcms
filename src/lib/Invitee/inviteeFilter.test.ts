/**
 * Which invitations the list shows: all, or only one status.
 *
 * An invitation is in exactly one of three states, the same the badge shows
 * (InviteeStatus): used once it has a redeemedAt; otherwise active or
 * deactivated by its "Actif" flag -- sign-in only accepts one that is active
 * and unused. The choice lives in the URL (?statut=...) so the back button, a
 * reload and a shared link all keep it; "all" is the absence of the parameter.
 */
import { describe, it, expect } from 'vitest';
import {
	countByStatus,
	filterFromParam,
	filterInvitees,
	filterToParam,
	inviteeStatusOf
} from './inviteeFilter';

const active = { uid: 'a', active: true, redeemedAt: null };
const used = { uid: 'u', active: true, redeemedAt: 1_790_000_000_000 };
const usedThenSwitchedOff = { uid: 'x', active: false, redeemedAt: 1_790_000_000_000 };
const disabled = { uid: 'd', active: false, redeemedAt: null };
const all = [active, used, usedThenSwitchedOff, disabled];

describe('inviteeStatusOf', () => {
	it('is "used" as soon as it was redeemed, whatever its flag', () => {
		expect(inviteeStatusOf(used)).toBe('used');
		expect(inviteeStatusOf(usedThenSwitchedOff)).toBe('used');
	});

	it('is "active" or "disabled" by its flag while unused', () => {
		expect(inviteeStatusOf(active)).toBe('active');
		expect(inviteeStatusOf(disabled)).toBe('disabled');
		expect(inviteeStatusOf({ active: null, redeemedAt: null })).toBe('disabled');
	});
});

describe('countByStatus', () => {
	it('counts every invitation once, and all of them', () => {
		expect(countByStatus(all)).toEqual({ all: 4, active: 1, used: 2, disabled: 1, check: 0 });
		expect(countByStatus([])).toEqual({ all: 0, active: 0, used: 0, disabled: 0, check: 0 });
	});
});

describe('filterInvitees', () => {
	it('keeps only the chosen status, or everything', () => {
		const uids = (filter: Parameters<typeof filterInvitees>[1]) =>
			filterInvitees(all, filter).map((i) => i.uid);
		expect(uids('all')).toEqual(['a', 'u', 'x', 'd']);
		expect(uids('active')).toEqual(['a']);
		expect(uids('used')).toEqual(['u', 'x']);
		expect(uids('disabled')).toEqual(['d']);
	});
});

describe('the URL parameter', () => {
	it('reads the French values, and anything else as "all"', () => {
		expect(filterFromParam('actives')).toBe('active');
		expect(filterFromParam('utilisees')).toBe('used');
		expect(filterFromParam('desactivees')).toBe('disabled');
		expect(filterFromParam(null)).toBe('all');
		expect(filterFromParam('nimportequoi')).toBe('all');
	});

	it('writes them back, "all" as no parameter', () => {
		expect(filterToParam('used')).toBe('utilisees');
		expect(filterToParam('all')).toBeNull();
	});
});

/**
 * "À vérifier": invitations whose ADDRESS is the problem, for the
 * administrator to check with the member and correct.
 *
 * - an address remembered by the backend (addressIssue: bounced, refused as
 *   written, or a refusal of the organization's mail), even before any new
 *   attempt;
 * - or its latest email bounced, was reported as spam, was not sent because
 *   of the address (suppressed), or was refused as written (invalid_request).
 *
 * A failure that is not the address's fault -- the mail service down, our
 * configuration -- is not "à vérifier": the address is fine, the email shows
 * as failed and can be sent again. Nor is a used invitation: the person
 * joined, whatever became of an email.
 *
 * It is not a fourth status but a cut across them, offered in the same
 * filter group (shown when there is something to check).
 */
import { needsCheck } from './inviteeFilter';

const delivery = (status: string, errorKind: string | null = null) =>
	({ status, at: '2026-10-06T12:00:00Z', error: null, errorKind }) as never;
const issue = (reason: string) => ({ reason, since: '2026-10-06T12:00:00Z', detail: null }) as never;

describe('needsCheck', () => {
	it.each(['bounced', 'complained', 'suppressed'])('an email %s', (status) => {
		expect(needsCheck({ ...active, emailDelivery: delivery(status) })).toBe(true);
	});

	it('an address refused as written', () => {
		expect(needsCheck({ ...active, emailDelivery: delivery('failed', 'invalid_request') })).toBe(true);
	});

	it('a remembered address, before any new attempt', () => {
		expect(needsCheck({ ...active, emailDelivery: delivery('sent'), addressIssue: issue('bounced') })).toBe(true);
	});

	it.each(['provider_unavailable', 'misconfigured', 'rate_limited', 'unreachable', 'outcome_unknown'])(
		'not a failure that is not the address’s fault (%s)',
		(kind) => {
			expect(needsCheck({ ...active, emailDelivery: delivery('failed', kind) })).toBe(false);
		}
	);

	it.each(['sent', 'delivered', 'queued', 'deferred'])('not an email %s', (status) => {
		expect(needsCheck({ ...active, emailDelivery: delivery(status) })).toBe(false);
	});

	it('not a used invitation', () => {
		expect(needsCheck({ ...used, emailDelivery: delivery('bounced') })).toBe(false);
	});

	it('not an invitation never emailed', () => {
		expect(needsCheck(active)).toBe(false);
	});
});

describe('the "À vérifier" filter', () => {
	const bounced = { ...active, uid: 'b', emailDelivery: delivery('bounced') };
	const list = [...all, bounced];

	it('is counted, across the statuses', () => {
		expect(countByStatus(list).check).toBe(1);
		expect(countByStatus(list).active).toBe(2);
	});

	it('keeps only the invitations to check', () => {
		expect(filterInvitees(list, 'check')).toEqual([bounced]);
	});

	it('lives in the address as ?statut=a-verifier', () => {
		expect(filterToParam('check')).toBe('a-verifier');
		expect(filterFromParam('a-verifier')).toBe('check');
	});
});

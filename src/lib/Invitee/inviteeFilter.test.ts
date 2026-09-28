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
		expect(countByStatus(all)).toEqual({ all: 4, active: 1, used: 2, disabled: 1 });
		expect(countByStatus([])).toEqual({ all: 0, active: 0, used: 0, disabled: 0 });
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

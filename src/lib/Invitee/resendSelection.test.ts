/**
 * Which invitations a reminder may go to, and which start ticked.
 *
 * Not sendable, so no checkbox: a used or deactivated invitation invites to
 * nothing; one whose email is still on its way would get two; one whose
 * address needs checking would only be recorded as suppressed, since a
 * reminder never forces a remembered bad address (the invitation's own page
 * can, once the address is checked).
 *
 * Sendable but unticked: an invitation emailed less than the organization's
 * number of days ago, so someone just reached by a batch is not mailed again
 * by reflex. A failed attempt does not count: that email never arrived.
 */
import { describe, it, expect } from 'vitest';
import type { Invitee } from '$lib/interfaces/v2/invitee';
import { resendEligibility, initialResendSelection } from './resendSelection';

const NOW = Date.parse('2026-10-20T12:00:00Z');
const DAY = 86_400_000;
const daysAgo = (days: number) => new Date(NOW - days * DAY).toISOString();

const invitee = (over: Partial<Invitee> = {}): Invitee => ({
	uid: 'u',
	email: 'someone@example.com',
	name: null,
	createdAt: daysAgo(60),
	createdBy: 'admin',
	role: 'staff',
	active: true,
	redeemedAt: null,
	emailDelivery: null,
	addressIssue: null,
	...over
});

const delivered = (days: number) => ({ status: 'delivered' as const, at: daysAgo(days), error: null });
const eligibility = (over: Partial<Invitee>, days = 30) => resendEligibility(invitee(over), NOW, days);

describe('resendEligibility', () => {
	it('leaves out a used invitation', () => {
		expect(eligibility({ redeemedAt: NOW - DAY })).toEqual({ sendable: false, reason: 'used' });
	});

	it('leaves out a deactivated invitation', () => {
		expect(eligibility({ active: false })).toEqual({ sendable: false, reason: 'disabled' });
	});

	it('leaves out one whose email is still on its way', () => {
		const emailDelivery = { status: 'queued' as const, at: daysAgo(0), error: null };
		expect(eligibility({ emailDelivery })).toEqual({ sendable: false, reason: 'queued' });
	});

	it('takes back one whose email waited too long to leave', () => {
		const emailDelivery = { status: 'queued' as const, at: daysAgo(1), error: null, timedOut: true };
		expect(eligibility({ emailDelivery })).toEqual({ sendable: true, preselected: true });
	});

	it('leaves out an address remembered as bad', () => {
		const addressIssue = { reason: 'bounced' as const, since: daysAgo(5), detail: null };
		expect(eligibility({ addressIssue })).toEqual({ sendable: false, reason: 'address' });
	});

	it('leaves out an address whose last email bounced', () => {
		const emailDelivery = { status: 'bounced' as const, at: daysAgo(40), error: '550' };
		expect(eligibility({ emailDelivery })).toEqual({ sendable: false, reason: 'address' });
	});

	it('ticks one never emailed', () => {
		expect(eligibility({})).toEqual({ sendable: true, preselected: true });
	});

	it('ticks one emailed longer ago than the organization waits', () => {
		expect(eligibility({ emailDelivery: delivered(31) })).toEqual({ sendable: true, preselected: true });
	});

	it('ticks one emailed exactly that many days ago', () => {
		expect(eligibility({ emailDelivery: delivered(30) })).toEqual({ sendable: true, preselected: true });
	});

	it('leaves unticked one emailed more recently', () => {
		expect(eligibility({ emailDelivery: delivered(10) })).toEqual({
			sendable: true,
			preselected: false,
			excludedBecause: 'recent'
		});
	});

	it('ticks one whose recent email failed', () => {
		const emailDelivery = { status: 'failed' as const, at: daysAgo(2), error: '503', errorKind: 'provider_unavailable' as const };
		expect(eligibility({ emailDelivery })).toEqual({ sendable: true, preselected: true });
	});

	it("waits the organization's number of days", () => {
		expect(eligibility({ emailDelivery: delivered(10) }, 7)).toEqual({ sendable: true, preselected: true });
	});
});

describe('initialResendSelection', () => {
	it('is the invitations that start ticked', () => {
		const invitees = [
			invitee({ uid: 'never' }),
			invitee({ uid: 'recent', emailDelivery: delivered(3) }),
			invitee({ uid: 'used', redeemedAt: NOW }),
			invitee({ uid: 'old', emailDelivery: delivered(90) })
		];
		expect(initialResendSelection(invitees, NOW, 30)).toEqual(new Set(['never', 'old']));
	});
});

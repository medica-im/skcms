/**
 * Pushed delivery changes replace what the list loaded, row by row.
 *
 * The invitations list is loaded once; the backend then pushes each change of
 * an email's status (GET /api/v2/invitees/events). The list shows, for each
 * invitation, the latest pushed delivery when there is one, the loaded one
 * otherwise -- and leaves every other field as loaded.
 */
import { describe, expect, it } from 'vitest';
import { withLatest } from './liveDeliveriesMerge';

const sent = { status: 'sent', at: '2026-10-06T12:00:00Z', error: null } as const;
const bounced = { status: 'bounced', at: '2026-10-06T12:00:09Z', error: '550 User unknown' } as const;

describe('withLatest', () => {
	it('replaces a pushed invitation’s delivery', () => {
		const list = [{ uid: 'a', name: 'A', emailDelivery: sent }];
		expect(withLatest(list, { a: bounced })).toEqual([{ uid: 'a', name: 'A', emailDelivery: bounced }]);
	});

	it('leaves the others as loaded, the same objects', () => {
		const other = { uid: 'b', name: 'B', emailDelivery: sent };
		const [, kept] = withLatest([{ uid: 'a', emailDelivery: sent }, other], { a: bounced })!;
		expect(kept).toBe(other);
	});

	it('gives a delivery to an invitation loaded without one', () => {
		expect(withLatest([{ uid: 'a', emailDelivery: null }], { a: sent })![0].emailDelivery).toEqual(sent);
	});

	it('passes a missing list through', () => {
		expect(withLatest(undefined, { a: sent })).toBeUndefined();
	});
});

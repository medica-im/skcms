/**
 * A pushed delivery is plain data, safe to hand on.
 *
 * The edit button opens its form through pushState, whose state the browser
 * copies (structuredClone). An invitation updated live used to carry its
 * delivery as a Svelte $state proxy, which cannot be copied: the copy threw
 * and the edit form never opened -- only for invitations whose email had
 * changed while the list was open, a bounced one typically.
 */
import { describe, it, expect } from 'vitest';
import { LiveDeliveries } from './liveDeliveries.svelte';

const bounced = { status: 'bounced', at: '2026-10-06T12:00:00Z', error: '550 User unknown' } as never;

describe('LiveDeliveries', () => {
	it('applies a received delivery to its invitation', () => {
		const live = new LiveDeliveries();
		live.receive('u1', bounced);
		const [invitee] = live.apply([{ uid: 'u1', emailDelivery: null }])!;
		expect(invitee.emailDelivery).toEqual(bounced);
	});

	it('hands on an invitation the browser can copy (pushState)', () => {
		const live = new LiveDeliveries();
		live.receive('u1', bounced);
		const [invitee] = live.apply([{ uid: 'u1', emailDelivery: null }])!;
		expect(() => structuredClone(invitee)).not.toThrow();
	});
});

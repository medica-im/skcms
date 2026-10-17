/**
 * Where each invitation's email stands, pushed by the backend as it changes.
 *
 * The invitations list is loaded once, but an email's story goes on after:
 * the worker settles it, then the mail service reports a delivery or a
 * bounce seconds to minutes later. The backend pushes each change as a
 * Server-Sent Event (GET /api/v2/invitees/events, backend mailer.live); no
 * polling. EventSource reconnects by itself when the connection drops.
 *
 * One stream for the whole invitation section, opened by its layout, so what
 * the mail service reports while the administrator moves from sending to the
 * list, or from the list to an invitation, is still there on arrival:
 *
 *   // web/invite/+layout.svelte
 *   const live = setLiveDeliveries(new LiveDeliveries());
 *   $effect(() => live.connect(url));   // closes on leaving the section
 *   // a page
 *   const live = getLiveDeliveries();
 *   let invitees = $derived(live.apply(data.invitees));
 *
 * A change published while no stream is listening shows on the next visit.
 */
import { createContext } from 'svelte';
import type { EmailDelivery } from '$lib/interfaces/v2/invitee';
import { withLatest } from './liveDeliveriesMerge';

export class LiveDeliveries {
	// Raw, and replaced on each change: plain objects, not $state proxies. The
	// invitations they reach are handed to pushState (the edit form), whose
	// structuredClone cannot copy a proxy -- the form silently never opened.
	latest = $state.raw<Record<string, EmailDelivery>>({});

	/** Listens until the returned function is called. */
	connect(url: string): () => void {
		const source = new EventSource(url, { withCredentials: true });
		source.addEventListener('delivery', (event) => {
			try {
				const { invitee_uid, emailDelivery } = JSON.parse((event as MessageEvent).data);
				if (invitee_uid && emailDelivery) this.receive(invitee_uid, emailDelivery);
			} catch (e) {
				console.error('Unreadable delivery event', e);
			}
		});
		return () => source.close();
	}

	/** One pushed change: where this invitation's email stands now. */
	receive(uid: string, delivery: EmailDelivery) {
		this.latest = { ...this.latest, [uid]: delivery };
	}

	apply<T extends { uid: string; emailDelivery?: EmailDelivery | null }>(list: T[] | undefined): T[] | undefined {
		return withLatest(list, this.latest);
	}
}

/** The section's stream, set by web/invite/+layout.svelte. */
export const [getLiveDeliveries, setLiveDeliveries] = createContext<LiveDeliveries>();

/**
 * Where each invitation's email stands, pushed by the backend as it changes.
 *
 * The invitations list is loaded once, but an email's story goes on after:
 * the worker settles it, then the mail service reports a delivery or a
 * bounce seconds to minutes later. The backend pushes each change as a
 * Server-Sent Event (GET /api/v2/invitees/events, backend mailer.live); no
 * polling. EventSource reconnects by itself when the connection drops.
 *
 *   const live = new LiveDeliveries();
 *   $effect(() => live.connect(url, invalidateAll));   // closes on unmount
 *   let invitees = $derived(live.apply(data.invitees));
 *
 * A change published while no stream was listening -- between the page's
 * render and the stream opening, or during a reconnection -- is gone. So on
 * every (re)connection the page reloads its list once (`reload`), and the
 * pushed values held so far are dropped: the fresh list knows better.
 */
import type { EmailDelivery } from '$lib/interfaces/v2/invitee';
import { withLatest } from './liveDeliveriesMerge';

export class LiveDeliveries {
	latest = $state<Record<string, EmailDelivery>>({});

	/** Listens until the returned function is called; `reload` on every (re)connection. */
	connect(url: string, reload?: () => unknown): () => void {
		const source = new EventSource(url, { withCredentials: true });
		source.addEventListener('open', () => {
			this.latest = {};
			reload?.();
		});
		source.addEventListener('delivery', (event) => {
			try {
				const { invitee_uid, emailDelivery } = JSON.parse((event as MessageEvent).data);
				if (invitee_uid && emailDelivery) this.latest[invitee_uid] = emailDelivery;
			} catch (e) {
				console.error('Unreadable delivery event', e);
			}
		});
		return () => source.close();
	}

	apply<T extends { uid: string; emailDelivery?: EmailDelivery | null }>(list: T[] | undefined): T[] | undefined {
		return withLatest(list, this.latest);
	}
}

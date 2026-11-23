import * as m from '$msgs';

export type PeerStatus = { online: true } | { online: false; status: number | null };

/**
 * Whether a peer's API answers: its organization, the first thing every page of
 * it asks for.
 *
 * Fetched by our server, not the browser: a peer's CORS list does not name us.
 * Redirects are not followed, so a peer that moved is offline here rather than
 * online on someone else's say-so.
 */
export async function peerStatus(
	origin: string,
	fetchFn: (url: string, init: RequestInit) => Promise<Response> = fetch
): Promise<PeerStatus> {
	try {
		const res = await fetchFn(`${origin.replace(/\/$/, '')}/api/v2/organization`, {
			headers: { Accept: 'application/json' },
			redirect: 'manual',
			signal: AbortSignal.timeout(5000)
		});
		return res.ok ? { online: true } : { online: false, status: res.status };
	} catch {
		return { online: false, status: null };
	}
}

/** The statuses a proxy answers when the server behind it is not there. */
export const isGatewayFailure = (status: number) => status === 502 || status === 503 || status === 504;

/** What to tell the reader when `name`'s data server did not answer. */
export const unreachableMessage = (name: string, status: number | null) =>
	status === null
		? m.BACKEND_OFFLINE_NO_ANSWER({ name })
		: m.BACKEND_OFFLINE({ name, status });

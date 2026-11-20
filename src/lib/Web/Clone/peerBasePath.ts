/** '' or segments of plain characters, no '.' or '..': what may go into a link on the peer. */
const PLAIN_PATH = /^(?:\/(?!\.{1,2}(?:\/|$))[\w.~-]+)*$/;

/**
 * Where a peer serves its pages ('' at its root, '/annuaire' under it), as the
 * peer states it in its organization; null when that cannot be known.
 *
 * Fetched by our server, not the browser: a peer's CORS list does not name us.
 * Redirects are not followed, and a peer that predates the field is unknown
 * rather than assumed to be at its root.
 */
export async function peerBasePath(
	origin: string,
	fetchFn: (url: string, init: RequestInit) => Promise<Response> = fetch
): Promise<string | null> {
	try {
		const res = await fetchFn(`${origin.replace(/\/$/, '')}/api/v2/organization`, {
			headers: { Accept: 'application/json' },
			redirect: 'manual',
			signal: AbortSignal.timeout(5000)
		});
		if (!res.ok) return null;
		const { base_path } = (await res.json()) as { base_path?: unknown };
		return typeof base_path === 'string' && PLAIN_PATH.test(base_path) ? base_path : null;
	} catch {
		return null;
	}
}

/**
 * The link from the clone wizard to the source's consent page.
 *
 * Under the *peer's* base path, which the peer states and the backend relays;
 * a peer is registered by origin alone, so nothing else here knows it. When it
 * could not be learnt (`null`: the peer is down or predates the field) the
 * wizard's own is assumed, which is right whenever both deployments share one.
 */
export function authorizeUrl({
	peerOrigin,
	peerBasePath,
	ownBasePath,
	target,
	back,
	instance,
	directory
}: {
	peerOrigin: string;
	peerBasePath: string | null;
	ownBasePath: string;
	/** This instance's origin: where the token is to be sent. */
	target: string;
	/** A path on this instance, where the source sends the browser back. */
	back: string;
	/** The peer's name in this instance's registry. */
	instance: string;
	directory?: string;
}): string {
	const basePath = peerBasePath ?? ownBasePath;
	const params = new URLSearchParams({ target, return: back, instance });
	if (directory) params.set('directory', directory);
	return `${peerOrigin.replace(/\/$/, '')}${basePath}/web/clone/authorize?${params}`;
}

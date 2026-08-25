/**
 * The clone token, held in memory and nowhere else.
 *
 * It is a bearer credential for a superuser's whole directory on another
 * deployment — names, addresses, phone numbers, emails — and it is valid for
 * fifteen minutes. Anything that outlives the tab it was minted for outlives
 * the reason it existed, so it is never written to localStorage or
 * sessionStorage, never put in a query string, and never serialised into page
 * data. Closing the tab loses it, which is correct.
 *
 * It arrives in the URL *fragment*: fragments are not sent to servers, do not
 * appear in access logs, and do not survive in `document.referrer`. The first
 * thing done with it is to take it out of the address bar.
 */

export const cloneToken = $state<{ value: string | null; instance: string | null }>({
	value: null,
	instance: null
});

/**
 * Take a token out of `location.hash` and scrub the URL.
 *
 * Returns whether one was found, so a caller can advance the wizard.
 */
export function takeTokenFromHash(loc?: { hash: string }, scrub?: () => void): boolean {
	const hash = loc?.hash ?? (typeof location !== 'undefined' ? location.hash : '');
	if (!hash || !hash.includes('token=')) return false;

	const params = new URLSearchParams(hash.replace(/^#/, ''));
	const token = params.get('token');
	if (!token) return false;

	cloneToken.value = token;
	cloneToken.instance = params.get('instance');

	// Out of the address bar before anything can copy it, and before a
	// screenshot or a shared link can carry it.
	//
	// The caller supplies the scrub: inside a SvelteKit page that means
	// `goto(..., { replaceState: true })`, because the raw History API conflicts
	// with the router — it warns, and then navigation misbehaves. Nothing is
	// scrubbed here by default for that reason.
	if (scrub) scrub();
	return true;
}

export function clearToken() {
	cloneToken.value = null;
	cloneToken.instance = null;
}

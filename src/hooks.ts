import type { Reroute } from '@sveltejs/kit';
import { base } from '$app/paths';
import { deLocalizeUrl } from '$prgld/runtime.js';

// Through the $skvar alias, not ./routes/(skvar): a test site server serves its
// tenant's skvar from a worktree (scripts/site-routes.sh), and the hardcoded
// path read the shared checkout's branch instead — annuaire's server saw Lyon
// 3's contact page there and 404'd rather than falling back.
const skvarContactExists = Object.keys(
	import.meta.glob('$skvar/contact/+page.svelte', { eager: false })
).length > 0;

export const reroute: Reroute = ({ url }) => {
	// `url.pathname` carries the base path, so the comparison and the route
	// returned must both account for it. Matching a bare '/contact' silently
	// stopped working on an instance served under /annuaire: the pathname is
	// '/annuaire/contact', the branch never fired, and a tenant whose skvar has
	// no contact page got a 404 instead of the fallback.
	if (url.pathname === `${base}/contact`) {
		if (!skvarContactExists) {
			return `${base}/fallback/contact`;
		}
		return;
	}
	return deLocalizeUrl(url).pathname;
};


import type { Reroute } from '@sveltejs/kit';
import { base } from '$app/paths';
import { deLocalizeUrl } from '$prgld/runtime.js';

const skvarContactExists = Object.keys(
	import.meta.glob('./routes/(skvar)/contact/+page.svelte', { eager: false })
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


import type { Reroute } from '@sveltejs/kit';
import { deLocalizeUrl } from '$prgld/runtime.js';

const skvarContactExists = Object.keys(
	import.meta.glob('./routes/(skvar)/contact/+page.svelte', { eager: false })
).length > 0;

export const reroute: Reroute = ({ url }) => {
	if (url.pathname === '/contact') {
		if (!skvarContactExists) {
			return '/fallback/contact';
		}
		return;
	}
	return deLocalizeUrl(url).pathname;
};


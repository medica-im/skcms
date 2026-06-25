import type { Reroute } from '@sveltejs/kit';
import { deLocalizeUrl } from '$prgld/runtime.js';
import { building } from '$app/environment';

export const reroute: Reroute = ({ url }) => {
	if (url.pathname === '/contact') {
        if (building) return;

        try {
            return;
        } catch {
            return '/fallback/contact';
        }
	}
	return deLocalizeUrl(url).pathname;
};


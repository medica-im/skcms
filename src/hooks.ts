import type { Reroute } from '@sveltejs/kit';
import { deLocalizeUrl } from '$prgld/runtime.js';
import type { Handle } from '@sveltejs/kit';
import { sequence } from "@sveltejs/kit/hooks";

export const reroute: Reroute = (request) => {
	return deLocalizeUrl(request.url).pathname;
};


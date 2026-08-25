import type { PageLoad } from './$types';

/**
 * Client-rendered, like /web/entries.
 *
 * The wizard's state — which peer, which token, which entries, which
 * resolutions — is entirely client-side, and the token in particular must never
 * be serialised into a payload or a URL.
 */
export const ssr = false;

export const load: PageLoad = async ({ data }) => data;

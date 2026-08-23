import { browser } from '$app/environment';
import { base } from '$app/paths';
import { PUBLIC_SSR_API_URL } from '$env/static/public';

/**
 * Where this app's API is reached from, whichever side is asking.
 *
 * Two addresses, because the two sides genuinely differ on a proxied instance:
 *
 *   browser -> `base`               a RELATIVE url: whatever host the page was
 *                                   served from, plus any base path. It must
 *                                   not be an absolute address — the BDD suite
 *                                   serves the same build on four hostnames
 *                                   (w0..w3.dev.medica.im), each resolving to
 *                                   its own tenant, and a baked-in host would
 *                                   send every worker to one site's data.
 *   server  -> PUBLIC_SSR_API_URL   the API host directly. A server-side fetch
 *                                   to the public address leaves the machine,
 *                                   comes back through the proxy in front, and
 *                                   arrives where it started — a loop that
 *                                   hangs the render rather than failing.
 *
 * On a site served at its own domain root the two hold the same value and the
 * distinction costs nothing.
 *
 * PUBLIC_SSR_API_URL is PUBLIC_ because this module is imported from universal
 * loads, which run on both sides: $env/static/private cannot be reached from
 * there at all. It is not a secret — the hostname is in public DNS — so the
 * prefix costs nothing beyond the name having to carry the warning.
 */
export const APP_URL = browser ? base : PUBLIC_SSR_API_URL;

/**
 * The address to put in markup, on either side: `base`, so relative.
 *
 * APP_URL answers "where do I fetch from", and on the server that is the direct
 * address — which must never reach the page, because an <img src> rendered
 * server-side is read by the BROWSER and would carry the internal hostname.
 *
 * Relative rather than PUBLIC_APP_URL for the same reason APP_URL is: one build
 * is served on several hostnames (w0..w3.dev.medica.im in the BDD suite, and
 * any site sharing an image), and a baked-in absolute host points all of them
 * at one tenant's media. A root-relative path resolves against whichever host
 * served the page, which is right in every case.
 */
export const PUBLIC_URL = base;

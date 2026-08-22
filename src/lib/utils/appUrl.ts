import { browser } from '$app/environment';
import { PUBLIC_APP_URL, PUBLIC_SSR_API_URL } from '$env/static/public';

/**
 * Where this app's API is reached from, whichever side is asking.
 *
 * Two addresses, because the two sides genuinely differ on a proxied instance:
 *
 *   browser -> PUBLIC_APP_URL       the public address, base path included.
 *                                   The browser can only route to this.
 *   server  -> PUBLIC_SSR_API_URL   the API host directly. A server-side fetch
 *                                   to the public address leaves the machine,
 *                                   comes back through the proxy in front, and
 *                                   arrives where it started — a loop that
 *                                   hangs the render rather than failing.
 *
 * On a site served at its own domain root the two hold the same value and the
 * distinction costs nothing.
 *
 * Both are PUBLIC_ because this module is imported from universal loads, which
 * run on both sides: $env/static/private cannot be reached from there at all.
 * The SSR address is not a secret — it is in public DNS — so the prefix costs
 * nothing beyond the name having to carry the warning instead of the compiler.
 */
export const APP_URL = browser ? PUBLIC_APP_URL : PUBLIC_SSR_API_URL;

/**
 * The address to put in markup: always the public one.
 *
 * APP_URL above answers "where do I fetch from", and on the server that is the
 * direct address. But an <img src> rendered server-side is read by the BROWSER,
 * which cannot necessarily reach it — and even where it can, it exposes the
 * internal hostname in the page. Anything that ends up as an attribute rather
 * than as a fetch target uses this instead.
 */
export const PUBLIC_URL = PUBLIC_APP_URL;

import { PUBLIC_ORIGIN } from '$env/static/public';
import { base } from '$app/paths';
import { browser } from '$app/environment';

/**
 * The prefix every API call is built on: `${ORIGIN}/api/v2/...`.
 *
 * In the browser this is `base`, not '': the app asks for /annuaire/api/... so
 * that everything clinic-cms touches lives inside its own prefix. nginx strips
 * the prefix again before forwarding, since the backend serves /api and /media
 * at its own root and knows nothing about the base path.
 *
 * That boundary is the point. A `location ^~ /annuaire` block cannot be reached
 * by WordPress — nginx stops at the prefix and never tries the php regex — so
 * keeping the API and the media under it means no plugin, upload-path setting
 * or new page can collide with them. With /api and /media at the site root they
 * are two more holes carved out of a namespace somebody else owns.
 *
 * `base` is '' for every site served at its own domain root, so this is exactly
 * what it was for them: `browser ? '' : PUBLIC_ORIGIN`.
 *
 * Server-side it stays PUBLIC_ORIGIN, which is an absolute origin and must not
 * carry the base path — see .env.dev.unipa.fr for why.
 */
export const ORIGIN = browser ? base : PUBLIC_ORIGIN;

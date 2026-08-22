/**
 * @deprecated Use `APP_URL` from `$lib/utils/appUrl`.
 *
 * Kept so the rename lands in one commit rather than a flag day. `ORIGIN` was
 * a poor name twice over: it collided with adapter-node's own ORIGIN variable,
 * which is a different value with a different meaning, and it held ''
 * client-side, which is not an origin.
 */
export { APP_URL as ORIGIN } from '$lib/utils/appUrl';

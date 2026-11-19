import { resolve } from '$app/paths';

/**
 * The app's base path, as SvelteKit 2's `base` from $app/paths was: '' for a
 * site at the root of its domain, '/annuaire' for one under it. Never
 * `resolve('')`, which ends in '/'.
 *
 * Absolute only because paths.relative is false (vite.config.ts): with it on,
 * resolve answers relative to the page being rendered, './' on a root site,
 * and `${base()}/signin` became '//signin'.
 */
export const base = (): string => resolve('').slice(0, -1);

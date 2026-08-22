import { base } from '$app/paths';
import type { Avatar } from '$lib/interfaces/facility.interface';

export type AvatarSize = 'lg' | 'sm';

/**
 * Shown when an entry has no picture of its own.
 *
 * Prefixed with `base` because this one is served by the app rather than by the
 * API: real avatars come back under `baseUri`, the API origin, and are already
 * absolute. Without the prefix every entry without a photo requests
 * /media/... at the domain root, which on an instance mounted under a base path
 * escapes it — on unipa.fr/annuaire that is WordPress, and a 404 for the single
 * image that renders most often.
 *
 * `base` is '' for every site served at a domain root, so this is unchanged
 * there. A function rather than a constant: `base` is not a compile-time
 * literal, and reading it at module scope would freeze whatever it was when
 * this module first loaded.
 */
const placeholder = () => `${base}/media/profile_images/default_profile_picture.png`;

/**
 * The URL to render an entry's avatar from.
 *
 * Deliberately carries no cache-busting parameter. Each upload is stored under
 * its own filename (see api/routers/avatar.py), so a replaced picture already
 * arrives with a URL of its own — a query string on top would only defeat
 * caching for pictures that have not changed.
 */
export function avatarSrc(
	avatar: Avatar | undefined | null,
	size: AvatarSize,
	baseUri: string
): string {
	const path =
		(size === 'lg' && avatar?.lg) || (size === 'sm' && avatar?.sm) || avatar?.raw || '';

	// No `base` here: baseUri is variables.BASE_URI, which already carries the
	// base path on an instance served under one (VITE_BASE_URI_* is set to
	// https://host/annuaire there, because the 79 API call sites that build
	// `${variables.BASE_URI}/api/...` need the prefix too). Adding it again
	// would produce /annuaire/annuaire/media/...
	return path ? `${baseUri}${path}` : placeholder();
}

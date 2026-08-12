import type { Avatar } from '$lib/interfaces/facility.interface';

export type AvatarSize = 'lg' | 'sm';

/** Shown when an entry has no picture of its own. */
const PLACEHOLDER = '/media/profile_images/default_profile_picture.png';

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

	return path ? `${baseUri}${path}` : PLACEHOLDER;
}

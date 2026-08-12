import type { Organization } from '$lib/interfaces/organization.ts';

/**
 * The organisation name to show in the app bar.
 *
 * A connected user gets the short label when the organisation has one; an
 * anonymous visitor always gets the full name, which is what identifies the
 * site to a first-time arrival. The short label is optional, so any unusable
 * value falls back to the full name rather than blanking the title.
 *
 * Capitalisation is the caller's job — `capitalizeFirstLetter` is locale-aware
 * and already applied at the call site.
 */
export function appBarTitle(
	organization: Partial<Organization> | undefined | null,
	isConnected: boolean
): string {
	const fullName = organization?.formatted_name ?? '';
	if (!isConnected) return fullName;
	return organization?.formatted_name_short?.trim() || fullName;
}
